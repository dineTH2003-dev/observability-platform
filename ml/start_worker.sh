#!/bin/bash

# start_worker.sh
# Wrapper script to start the ML anomaly detection worker

cd "$(dirname "$0")"

# Activate virtual environment
source .venv/bin/activate

# Load environment variables if they are not already set
# For local testing, we assume the user has set them or we source .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Starting ML Anomaly Worker..."
echo "Using DB: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Backend API: $BACKEND_API_URL"

# Run the worker script with a 60 second interval
python -m app.jobs.run_worker --interval-seconds 60 --minutes 60
