"""Standalone Flask API for phishing URL prediction."""

from __future__ import annotations

from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/predict-url", methods=["POST"])
def predict_url_endpoint():
    data = request.get_json(silent=True) or {}
    url = str(data.get("url", "")).strip()

    if not url:
        return jsonify({"error": "Missing required field: url"}), 400

    try:
        from predict import predict_url

        result = predict_url(url)
        return jsonify(
            {
                "prediction": result["prediction"],
                "confidence": round(float(result["confidence"]), 4),
            }
        ), 200
    except FileNotFoundError:
        return jsonify({"error": "Model not found. Train the model first."}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/predict-email", methods=["POST"])
def predict_email_endpoint():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()

    if not text:
        return jsonify({"error": "Missing required field: text"}), 400

    try:
        from predict_email import predict_email_text

        result = predict_email_text(text)
        return jsonify(
            {
                "prediction": int(result["prediction"]),
                "confidence": round(float(result["confidence"]), 4),
            }
        ), 200
    except FileNotFoundError:
        return jsonify({"error": "LSTM model assets not found. Train model first."}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
