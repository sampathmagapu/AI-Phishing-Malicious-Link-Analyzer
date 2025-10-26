# AI-Phishing-Malicious-Link-Analyzer

# 🛡️ PhishGuard Pro - AI Phishing & Malicious Link Analyzer

**Hackathon Project**

## Overview 🚀

PhishGuard Pro is an AI-powered tool developed for the hackathon to detect, classify, and warn users about potentially harmful links or messages in real time. It utilizes machine learning (specifically, a `HistGradientBoostingClassifier` trained on URL features) served via a FastAPI backend with an interactive web frontend.

## Problem Statement 🎯

The speed and sophistication of phishing attacks, scams, and malware links far outpace manual human detection. Existing tools can be slow or lack explainability. This project aims to provide a fast, visually intuitive, and explainable analyzer.

## Features ✨

* **Real-time Analysis:** Scores URLs or messages pasted by the user.
* **QR Code Scanning:** Analyzes URLs embedded in QR codes via webcam.
* **Risk Visualization:** Displays a clear risk score (0-100%) on a dynamic gauge. 
* **Clear Verdict:** Classifies links as "Benign", "Suspicious", or "High Risk" based on configurable thresholds.
* **Explainability:** Shows key features contributing to the risk score (e.g., "Contains IP", "Brand Lookalike Hint", "High Special Char Ratio").
* **High Recall Mode:** Optional toggle to use a more aggressive threshold for catching potential threats, accepting more false positives.

## Tech Stack 🛠️

* **Backend:** Python 3.13, FastAPI, Uvicorn
* **Machine Learning:** Scikit-learn (`HistGradientBoostingClassifier`, `CalibratedClassifierCV`), Pandas, NumPy
* **Feature Engineering:** `tldextract`, custom regex logic
* **Frontend:** HTML, Tailwind CSS, JavaScript
* **Visualization:** Chart.js (for the gauge)
* **QR Scanning:** `html5-qrcode`

## How It Works ⚙️

1.  **Input:** User provides a URL, text message, or scans a QR code.
2.  **Feature Extraction:** The Python backend (`featureizer.py`) extracts ~22 lexical and structural features from the URL(s).
3.  **Prediction:** The pre-trained Scikit-learn model (`phish_url_hgb_cal.joblib`) predicts the probability of the URL being malicious.
4.  **Response:** The FastAPI backend (`main.py`) sends a JSON response containing the score, verdict, and key risk factors to the frontend.
5.  **Display:** The JavaScript frontend (`script.js`) updates the gauge, verdict text, and risk factor badges in the HTML (`index.html`).

## Setup & Running 🏁

*(Add instructions later on how to set up the environment and run the FastAPI server)*

```bash
# Example setup (you'll fill this in)
pip install -r requirements.txt
uvicorn main:app --reload
