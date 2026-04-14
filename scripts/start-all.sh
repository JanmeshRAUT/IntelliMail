#!/bin/bash

# Start the Python ML Backend in the background
echo "Starting IntelliMail ML Backend..."
python intellmail/app.py &

# Start the Node/React Proxy Server in the foreground
echo "Starting IntelliMail Frontend & Server..."
export ML_SERVICE_URL=http://127.0.0.1:7860
export LSTM_SERVICE_URL=http://127.0.0.1:7860/
npx tsx server.ts
