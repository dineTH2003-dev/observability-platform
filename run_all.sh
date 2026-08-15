#!/bin/bash

echo "Starting Observability Platform Services..."
echo "============================================"

# Function to handle script termination and kill all background processes
cleanup() {
    echo ""
    echo "Stopping all services..."
    # Kill all child processes of this script
    kill $(jobs -p) 2>/dev/null
    wait $(jobs -p) 2>/dev/null
    echo "All services stopped."
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM to call the cleanup function
trap cleanup SIGINT SIGTERM

echo "-> Starting Backend (Port 9000)..."
(cd backend && npm run dev) &

echo "-> Starting Frontend (Port 3000)..."
(cd frontend && npm run dev) &

echo "-> Starting ML Worker..."
(cd ml && ./start_worker.sh) &

# Add a slight delay before starting mock agent to ensure backend is up
sleep 2
echo "-> Starting Mock Agent (Data Simulator)..."
(source ml/.venv/bin/activate && python mock_agent.py) &

echo "============================================"
echo "All services are starting up!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:9000"
echo "Press Ctrl+C at any time to stop all services."
echo "============================================"

# Wait for all background jobs so the script doesn't exit immediately
wait
