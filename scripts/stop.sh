#!/bin/bash
# Stop gastown-dispatch dev servers

echo "Stopping servers..."
pkill -f "tsx watch" 2>/dev/null
pkill -f "vite" 2>/dev/null
echo "Done"
