import joblib
import json
import re
import pandas as pd
import numpy as np
from pathlib import Path
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import traceback

# --- Import featureizer from current directory ---
try:
    from featureizer import features_from_url
    print("Backend: featureizer imported successfully from current directory.")
except ImportError as e:
    print(f"FATAL ERROR: Could not import featureizer: {e}")
    def features_from_url(url: str) -> pd.DataFrame:
        print("DUMMY features_from_url called - featureizer is missing!")
        return pd.DataFrame()

# --- Configuration ---
MODEL_DIR = Path("models")
MODEL_PATH = MODEL_DIR / "phish_url_hgb_cal.joblib"
SCHEMA_PATH = MODEL_DIR / "schema.json"

# --- Load Model and Schema ---
try:
    model = joblib.load(MODEL_PATH)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    FEATURE_COLS = schema["feature_cols"]
    TLD_CATS = schema["tld_categories"]
    
    # Use demo-friendly threshold from your Jupyter
    high_recall_threshold = 0.20

    print("Model and schema loaded successfully.")
    print(f"Using High Recall Threshold: {high_recall_threshold:.2f}")

except FileNotFoundError:
    print(f"FATAL ERROR: Model or Schema not found.")
    model, schema, FEATURE_COLS, TLD_CATS, high_recall_threshold = None, {}, [], [], 0.20
except Exception as e:
    print(f"Error loading model or schema: {e}")
    model, schema, FEATURE_COLS, TLD_CATS, high_recall_threshold = None, {}, [], [], 0.20

# --- FastAPI App Initialization ---
app = FastAPI(title="PhishGuard Pro API", description="API for Phishing URL Analysis")
api_router = APIRouter()

# --- Pydantic Models ---
class ScoreRequest(BaseModel):
    text: str = Field(..., description="The URL or text message to analyze")

class ScoreResponse(BaseModel):
    probability: float
    is_phishing_std: bool
    is_phishing_hr: bool
    high_recall_threshold: float
    features: Optional[Dict[str, Any]] = None
    risk_factors: List[str] = []

# --- Feature Alignment Function ---
def to_aligned_df(url: str) -> pd.DataFrame:
    """Align features to training schema: order + dtypes"""
    try:
        # Get features from featureizer
        feature_df = features_from_url(url)
        
        # Debug: Check what we're getting
        print(f"Featureizer returned DataFrame with shape: {feature_df.shape}")
        print(f"Columns: {list(feature_df.columns)}")
        
        if feature_df.empty:
            raise ValueError("Featureization returned empty DataFrame")
            
        # Ensure we have the right number of columns
        if len(feature_df.columns) != len(FEATURE_COLS):
            print(f"WARNING: Expected {len(FEATURE_COLS)} columns, got {len(feature_df.columns)}")
            
        # Add missing columns and enforce order
        for c in FEATURE_COLS:
            if c not in feature_df.columns:
                print(f"Adding missing column: {c}")
                feature_df[c] = 0
                
        feature_df = feature_df[FEATURE_COLS]
        
        # Convert numerics first
        for c in FEATURE_COLS:
            if c != "TLD":
                feature_df[c] = pd.to_numeric(feature_df[c], errors="coerce").fillna(0)
        
        # Handle TLD categorical - ensure it's in the right categories
        if "TLD" in feature_df.columns:
            feature_df["TLD"] = feature_df["TLD"].astype(str).str.lower()
            # Map to valid categories
            feature_df["TLD"] = feature_df["TLD"].apply(
                lambda t: t if t in TLD_CATS else ("other" if "other" in TLD_CATS else TLD_CATS[0])
            )
            feature_df["TLD"] = pd.Categorical(feature_df["TLD"], categories=TLD_CATS)
        
        print(f"Final aligned DataFrame shape: {feature_df.shape}")
        return feature_df
        
    except Exception as e:
        print(f"Error in to_aligned_df: {e}")
        print(traceback.format_exc())
        raise

# --- Helper: Extract URLs ---
def extract_urls(text: str) -> List[str]:
    url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+', re.IGNORECASE)
    return url_pattern.findall(text)

# --- Helper: Map Features to Risk Factors ---
def map_features_to_factors(features: Dict[str, Any]) -> List[str]:
    factors = []
    try:
        getFeature = lambda k, d=0: features.get(k, d)
        
        if getFeature('BrandMismatchHint') == 1: 
            factors.append('Potential Brand Lookalike')
        if getFeature('IsDomainIP') == 1: 
            factors.append('Uses IP Address Host')
        if getFeature('HasObfuscation') == 1 or getFeature('ContainsAt') == 1: 
            factors.append('Contains Obfuscation (@ or %)')
        if getFeature('HasRedirectWord') == 1: 
            factors.append('Contains Sensitive Keywords (login, verify etc.)')
        if getFeature('NoOfSubDomain', 0) > 2: 
            factors.append(f'Multiple Subdomains ({int(getFeature("NoOfSubDomain", 0))})')
        if getFeature('IsHTTPS') == 0: 
            factors.append('Not HTTPS')
        if getFeature('SpacialCharRatioInURL', 0) > 0.25: 
            factors.append('High Special Character Ratio')
        if getFeature('URLLength', 0) > 75: 
            factors.append('Very Long URL')
        if getFeature('TLD') == 'other' and getFeature('IsDomainIP') == 0: 
            factors.append('Uncommon/Invalid TLD')
            
    except Exception as e:
        print(f"Error mapping features to factors: {e}")
    return factors

# --- API Endpoint ---
@api_router.post("/score", response_model=ScoreResponse)
async def score_url(request: ScoreRequest):
    if model is None or not schema:
        raise HTTPException(status_code=500, detail="Model or schema not loaded.")

    text_input = request.text.strip()
    urls = extract_urls(text_input)

    if not urls:
        if re.search(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', text_input):
             urls = [text_input]
        else:
             return ScoreResponse(
                 probability=0.0,
                 is_phishing_std=False,
                 is_phishing_hr=False, 
                 high_recall_threshold=high_recall_threshold,
                 features={},
                 risk_factors=["No valid URL found in input."]
             )

    target_url = urls[0] 

    try:
        # Use the aligned function
        feature_df = to_aligned_df(target_url)

        if feature_df.empty:
            raise ValueError("Featureization returned empty DataFrame")

        # Convert features for response
        features_dict = feature_df.iloc[0].astype(object).to_dict()
        if 'TLD' in features_dict:
            features_dict['TLD'] = str(features_dict['TLD'])

        # Prediction
        probability = float(model.predict_proba(feature_df)[0][1])

        risk_factors = map_features_to_factors(features_dict)
        is_phishing_std = probability > 0.5
        is_phishing_hr = probability > high_recall_threshold

        return ScoreResponse(
            probability=probability,
            is_phishing_std=is_phishing_std,
            is_phishing_hr=is_phishing_hr,
            high_recall_threshold=high_recall_threshold,
            features=features_dict,
            risk_factors=risk_factors
        )

    except Exception as e:
        print(f"Error during prediction for URL '{target_url}': {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error during analysis: {str(e)}")

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "model_loaded": model is not None}

# --- Include API Router with prefix ---
app.include_router(api_router, prefix="/api")

# --- Serve static files ---
app.mount("/", StaticFiles(directory="static", html=True), name="static")

print("✅ API routes registered at /api/score and /api/health")
print("✅ Server ready! Visit http://localhost:8000")