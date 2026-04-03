"""Standalone Flask API for phishing URL prediction."""

from __future__ import annotations

from flask import Flask, jsonify, request

from predict import predict_url

app = Flask(__name__)


@app.route("/predict-url", methods=["POST"])
def predict_url_endpoint():
    data = request.get_json(silent=True) or {}
    url = str(data.get("url", "")).strip()

    if not url:
        return jsonify({"error": "Missing required field: url"}), 400

    try:
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
