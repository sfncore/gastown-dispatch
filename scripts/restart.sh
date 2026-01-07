#!/bin/bash
# Restart gastown-dispatch dev servers

cd "$(dirname "$0")/.."

echo "Stopping existing servers..."
pkill -f "tsx watch" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

echo "Starting backend..."
cd src/backend
npm run dev &
BACKEND_PID=$!
cd ../..

sleep 2

echo "Starting frontend..."
cd src/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "==================================="
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
