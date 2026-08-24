#!/bin/bash

# start_worker.sh
# Wrapper script to start the ML anomaly detection worker

cd "$(dirname "$0")"

# Use the platform-specific virtual environment interpreter directly.
if [ -f ".venv/Scripts/python.exe" ]; then
  PYTHON=".venv/Scripts/python.exe"
elif [ -f ".venv/bin/python" ]; then
  PYTHON=".venv/bin/python"
else
  echo "ML virtual environment not found. Create ml/.venv first." >&2
  exit 1
fi

# Load environment variables if they are not already set
# For local testing, we assume the user has set them or we source .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
elif [ -f ../backend/.env ]; then
  set -a
  source ../backend/.env
  set +a
fi

echo "Starting ML Anomaly Worker..."
echo "Using DB: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Backend API: $BACKEND_API_URL"

# Run the worker script with a 60 second interval
"$PYTHON" -m app.jobs.run_worker --interval-seconds 60 --minutes 60
