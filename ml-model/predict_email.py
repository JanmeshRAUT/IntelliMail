"""LSTM email-content inference helpers."""

from __future__ import annotations

import pickle
import re
from pathlib import Path
from typing import Any, Dict

MAX_LEN = 200

_MODEL = None
_TOKENIZER = None


def _clean_text(text: str) -> str:
    cleaned = str(text).lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _resolve_model_path() -> Path:
    candidates = [
        Path("artifacts/models/lstm_model.h5"),
        Path("lstm_model.h5"),
        Path("artifacts/lstm_model/lstm_phishing_model.h5"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("LSTM model file not found in expected locations")


def _resolve_tokenizer_path() -> Path:
    candidates = [
        Path("artifacts/models/tokenizer.pkl"),
        Path("tokenizer.pkl"),
        Path("artifacts/lstm_model/tokenizer.pkl"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Tokenizer file not found in expected locations")


def _load_assets() -> tuple[Any, Any]:
    global _MODEL, _TOKENIZER

    # Import TensorFlow only when needed so service startup remains fast.
    from tensorflow.keras.models import load_model

    if _MODEL is None:
        _MODEL = load_model(_resolve_model_path())

    if _TOKENIZER is None:
        with open(_resolve_tokenizer_path(), "rb") as file:
            _TOKENIZER = pickle.load(file)

    return _MODEL, _TOKENIZER


def predict_email_text(text: str) -> Dict[str, Any]:
    from tensorflow.keras.preprocessing.sequence import pad_sequences

    model, tokenizer = _load_assets()

    cleaned = _clean_text(text)
    sequence = tokenizer.texts_to_sequences([cleaned])
    padded = pad_sequences(sequence, maxlen=MAX_LEN)
    confidence = float(model.predict(padded, verbose=0).flatten()[0])
    prediction = 1 if confidence >= 0.5 else 0

    return {
        "prediction": prediction,
        "confidence": confidence,
    }