#!/bin/bash
# Restart gastown-dispatch dev servers

cd "$(dirname "$0")/.."

echo "Stopping existing servers..."

# Kill more aggressively - find exact PIDs and send SIGKILL after timeout
for pattern in "tsx.*src/backend" "vite.*src/frontend" "node.*gastown-dispatch"; do
    pids=$(pgrep -f "$pattern" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "  Stopping: $pattern"
        kill $pids 2>/dev/null
        # Wait up to 3 seconds for graceful exit
        for i in {1..6}; do
            if ! pgrep -f "$pattern" >/dev/null 2>&1; then
                break
            fi
            sleep 0.5
        done
        # Force kill if still running
        pgrep -f "$pattern" >/dev/null 2>&1 && kill -9 $(pgrep -f "$pattern") 2>/dev/null
    fi
done

# Also kill by port in case processes are hanging
lsof -ti:4320 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:4321 2>/dev/null | xargs kill -9 2>/dev/null

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
echo "Backend:  http://localhost:4320"
echo "Frontend: http://localhost:4321"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
