"""Standalone Flask API for phishing URL prediction."""

from __future__ import annotations

import logging
import time

from flask import Flask, Response, jsonify, request
from prometheus_client import Counter, Histogram, generate_latest

app = Flask(__name__)

logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

REQUEST_COUNT = Counter("app_requests_total", "Total API Requests")
REQUEST_LATENCY = Histogram("app_request_latency_seconds", "Request latency")


@app.before_request
def before_request():
    request.start_time = time.time()
    REQUEST_COUNT.inc()


@app.before_request
def log_request():
    logging.info("%s %s", request.method, request.path)


@app.after_request
def after_request(response):
    start_time = getattr(request, "start_time", None)
    if start_time is not None:
        latency = time.time() - start_time
        REQUEST_LATENCY.observe(latency)
    return response


@app.route("/metrics")
def metrics():
    return Response(generate_latest(), mimetype="text/plain")


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
