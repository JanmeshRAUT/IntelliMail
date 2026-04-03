"""Prediction module for phishing URL detection."""

from __future__ import annotations

import os
from typing import Dict

from model import PhishingURLModel

_MODEL = None
DEFAULT_MODEL_PATH = "artifacts/models/phishing_url_model.pkl"


def _load_model(model_path: str = DEFAULT_MODEL_PATH) -> PhishingURLModel:
    global _MODEL
    if _MODEL is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        _MODEL = PhishingURLModel.load(model_path)
    return _MODEL


def predict_url(url: str) -> Dict[str, float | str]:
    """
    Predict if a URL is phishing.

    Returns:
    {
      "prediction": "phishing" or "legitimate",
      "confidence": float
    }
    """
    model = _load_model()
    prediction, confidence = model.predict_url(url)
    return {
        "prediction": prediction,
        "confidence": float(confidence),
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python predict.py <url>")
        raise SystemExit(1)

    print(predict_url(sys.argv[1]))
