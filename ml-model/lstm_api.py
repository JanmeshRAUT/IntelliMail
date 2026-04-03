"""Standalone Flask API for LSTM email content prediction."""

from __future__ import annotations

from flask import Flask, jsonify, request

from predict_email import predict_email_text

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "lstm-email-classifier"}), 200


@app.route("/predict-email", methods=["POST"])
def predict_email_endpoint():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()

    if not text:
        return jsonify({"error": "Missing required field: text"}), 400

    try:
        result = predict_email_text(text)
        return jsonify(
            {
                "prediction": int(result["prediction"]),
                "confidence": round(float(result["confidence"]), 4),
            }
        ), 200
    except FileNotFoundError:
        return jsonify({"error": "LSTM model assets not found. Train model first."}), 503
    except Exception as exc:  # pragma: no cover - defensive API boundary
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)