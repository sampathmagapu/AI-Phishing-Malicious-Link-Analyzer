# AI-Phishing-Malicious-Link-Analyzer

# 🛡️ PhishGuard Pro - AI Phishing & Malicious Link Analyzer

**Hackathon Project**

**Developed by: Sampath Magapu**

## Overview 🚀

[cite\_start]PhishGuard Pro is an **AI-powered tool** developed to detect, classify, and warn users about potentially harmful links or messages in real time[cite: 1]. [cite\_start]It utilizes a machine learning model (`HistGradientBoostingClassifier` with `CalibratedClassifierCV`) served via a FastAPI backend, supported by a modern, interactive web frontend[cite: 1].

## Problem Statement 🎯

[cite\_start]The speed and sophistication of phishing attacks, scams, and malware links far outpace manual human detection[cite: 1]. Existing tools can be slow or lack explainability. [cite\_start]This project aims to provide a fast, visually intuitive, and **explainable analyzer**[cite: 1].

## Features ✨

  * [cite\_start]**Real-time Analysis:** Scores URLs or messages pasted by the user[cite: 1].
  * [cite\_start]**QR Code Scanning:** Analyzes URLs embedded in QR codes via webcam[cite: 1].
  * [cite\_start]**Risk Visualization:** Displays a clear risk score (0-100%) on a dynamic gauge[cite: 1].
  * [cite\_start]**Clear Verdict:** Classifies links as "Benign," "Suspicious," or "High Risk" based on configurable thresholds[cite: 1].
  * [cite\_start]**Explainability:** Shows key features contributing to the risk score (e.g., "Contains IP," "Brand Lookalike Hint," "High Special Char Ratio")[cite: 1].
  * [cite\_start]**High Recall Mode:** Optional toggle to use a more aggressive threshold for catching potential threats, accepting more false positives[cite: 1].

## Tech Stack 🛠️

  * [cite\_start]**Backend:** Python 3.13, FastAPI, Uvicorn[cite: 1].
  * [cite\_start]**Machine Learning:** Scikit-learn (`HistGradientBoostingClassifier`, `CalibratedClassifierCV`), Pandas, NumPy[cite: 1].
  * [cite\_start]**Feature Engineering:** `tldextract`, custom regex logic (extracting \~22 features)[cite: 1].
  * [cite\_start]**Frontend:** HTML, Tailwind CSS, JavaScript[cite: 1].
  * [cite\_start]**Visualization:** Chart.js (for the gauge)[cite: 1].
  * [cite\_start]**QR Scanning:** `html5-qrcode`[cite: 1].

## How It Works ⚙️

1.  [cite\_start]**Input:** User provides a URL, text message, or scans a QR code[cite: 1].
2.  [cite\_start]**Feature Extraction:** The Python backend (`featureizer.py`) extracts \~22 lexical and structural features from the URL(s)[cite: 1].
3.  [cite\_start]**Prediction:** The pre-trained Scikit-learn model (`phish_url_hgb_cal.joblib`) predicts the probability of the URL being malicious[cite: 1].
4.  [cite\_start]**Response:** The FastAPI backend (`main.py`) sends a JSON response containing the score, verdict, and key risk factors to the frontend[cite: 1].
5.  [cite\_start]**Display:** The JavaScript frontend (`script.js`) updates the gauge, verdict text, and risk factor badges in the HTML (`index.html`)[cite: 1].

-----

## **Setup & Running 🏁**

To run the PhishGuard Pro locally, follow these steps.

### **Prerequisites**

  * Python 3.13 or higher.
  * `pip` (Python package installer).

### **1. Environment Setup**

First, ensure you have a virtual environment set up (recommended) and the necessary packages installed.

```bash
# Create and activate a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Linux/macOS
# .\venv\Scripts\activate # On Windows

# Install required dependencies
pip install fastapi uvicorn[standard] pydantic scikit-learn pandas numpy joblib tldextract
```

### **2. Project Structure**

Ensure your files are arranged exactly as follows:

```
phishguard-pro/
├── main.py
├── featureizer.py
├── models/
│   ├── phish_url_hgb_cal.joblib
│   └── schema.json
└── static/
    ├── index.html
    └── script.js
```

### **3. Run the Backend API**

Start the FastAPI server using Uvicorn. The application will serve the frontend from the `/static` folder and the main page from the root (`/`).

```bash
uvicorn main:app --reload
```

The application will typically be accessible at: **[http://127.0.0.1:8000/](https://www.google.com/search?q=http://127.0.0.1:8000/)**

Open this address in your browser to interact with the PhishGuard Pro web interface.
