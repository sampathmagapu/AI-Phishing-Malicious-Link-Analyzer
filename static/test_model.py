import joblib
import json
import pandas as pd
from pathlib import Path
from featureizer import featureize_url

# Load model and schema
MODEL_PATH = Path("models/phish_url_hgb_cal.joblib")
SCHEMA_PATH = Path("models/schema.json")

print("Loading model and schema...")
model = joblib.load(MODEL_PATH)
with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
    schema = json.load(f)

print(f"Model loaded: {type(model)}")
print(f"Feature columns: {len(schema['feature_cols'])}")
print(f"TLD categories: {len(schema['tld_categories'])}")

# Test URLs
test_urls = [
    "https://www.google.com",
    "https://secure-paypa1.com.verify-account.co/reset?session=abc123",
    "http://192.168.1.1/login.php",
    "http://example.com/%2F%2E%2E/redirect",
    "https://www.uni-mainz.de"
]

print("\n" + "="*50)
print("TESTING MODEL PREDICTIONS")
print("="*50)

for url in test_urls:
    print(f"\nURL: {url}")
    
    # Featureize
    features_df = featureize_url(url)
    print(f"Features shape: {features_df.shape}")
    
    # Predict
    probability = model.predict_proba(features_df)[0][1]
    prediction = model.predict(features_df)[0]
    
    print(f"Probability: {probability:.4f}")
    print(f"Prediction: {prediction} ({'PHISHING' if prediction == 1 else 'BENIGN'})")
    print(f"Standard threshold (0.5): {'PHISHING' if probability > 0.5 else 'BENIGN'}")
    print(f"High recall threshold (2.8381e-11): {'PHISHING' if probability > 2.8381e-11 else 'BENIGN'}")