import re
from urllib.parse import urlparse
import tldextract
import pandas as pd
import numpy as np
import json

# Load final schema (contains feature order and TLD category space)
SCHEMA = json.load(open("models/schema.json","r",encoding="utf-8"))
FEATURE_COLS = SCHEMA["feature_cols"]
TLD_CATS = SCHEMA["tld_categories"]  # ordered list saved at training

def _is_ipv4(host: str) -> bool:
    if not host: return False
    m = re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host)
    if not m: return False
    return all(0 <= int(p) <= 255 for p in host.split("."))

def features_from_url(url: str) -> pd.DataFrame:
    # Normalize scheme for consistent parsing
    u = (url or "").strip()
    if not re.match(r"^[a-zA-Z]+://", u):
        u = "http://" + u

    parsed = urlparse(u)
    host = parsed.hostname or ""
    ext = tldextract.extract(u)

    # Basic parts
    tld_raw = (ext.suffix or "unknown").lower()
    url_len = len(u)
    domain = ".".join([p for p in [ext.subdomain, ext.domain, ext.suffix] if p]) if not _is_ipv4(host) else host
    domain_len = len(domain)

    is_https = 1 if (parsed.scheme or "").lower() == "https" else 0
    is_ip = 1 if _is_ipv4(host) else 0
    subdomain = ext.subdomain or ""
    no_sub = 0 if (is_ip or not subdomain) else subdomain.count(".") + 1

    letters = len(re.findall(r"[A-Za-z]", u))
    digits  = len(re.findall(r"[0-9]", u))
    others  = len(re.findall(r"[^A-Za-z0-9]", u))

    letter_ratio  = (letters/url_len) if url_len else 0.0
    digit_ratio   = (digits/url_len)  if url_len else 0.0
    special_ratio = (others/url_len)  if url_len else 0.0

    qmarks = u.count("?")
    amps   = u.count("&")
    equals = u.count("=")

    U = u.upper()
    # Obfuscation tokens used in training; includes '%' escapes and '@'
    has_obf = 1 if ("@" in u or re.search(r"%[0-9A-F]{2}", U)) else 0
    no_obf_chars = len(re.findall(r"%[0-9A-F]{2}", U))
    obf_ratio = (no_obf_chars/url_len) if url_len else 0.0

    # Lexical flags used during retraining (keep simple, fast regex)
    L = u.lower()
    contains_at = 1 if "@" in u else 0
    has_redirect_word = 1 if any(w in L for w in ["redirect","verify","login","account","update","signin","auth","confirm"]) else 0
    brand_mismatch_hint = 1 if any(p in L for p in ["paypa1","secure-paypa","verify-account","confirm-account","support-","-login","account-update"]) else 0

    # TLD mapping into the training category space
    tld_norm = tld_raw if tld_raw in TLD_CATS else ("other" if "other" in TLD_CATS else TLD_CATS[0])

    row = {
        "URLLength": url_len,
        "DomainLength": domain_len,
        "IsDomainIP": is_ip,
        "TLD": tld_norm,
        "TLDLength": len(tld_raw),
        "NoOfSubDomain": no_sub,
        "HasObfuscation": has_obf,
        "NoOfObfuscatedChar": no_obf_chars,
        "ObfuscationRatio": obf_ratio,
        "NoOfLettersInURL": letters,
        "LetterRatioInURL": letter_ratio,
        "NoOfDegitsInURL": digits,
        "DegitRatioInURL": digit_ratio,
        "NoOfEqualsInURL": equals,
        "NoOfQMarkInURL": qmarks,
        "NoOfAmpersandInURL": amps,
        "NoOfOtherSpecialCharsInURL": others,
        "SpacialCharRatioInURL": special_ratio,
        "IsHTTPS": is_https,
        "ContainsAt": contains_at,
        "HasRedirectWord": has_redirect_word,
        "BrandMismatchHint": brand_mismatch_hint
    }

    # Align to training schema: order + dtypes
    X = pd.DataFrame([row])
    for c in FEATURE_COLS:
        if c not in X.columns:
            X[c] = 0
    X = X[FEATURE_COLS]
    # Cast numerics first
    for c in FEATURE_COLS:
        if c != "TLD":
            X[c] = pd.to_numeric(X[c], errors="coerce").fillna(0).astype(np.float64)
    # Set categorical last
    X["TLD"] = pd.Categorical(X["TLD"], categories=TLD_CATS)
    return X
