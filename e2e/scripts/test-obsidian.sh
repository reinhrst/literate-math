#!/bin/bash
set -e

echo "Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1280x720x24 &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

echo "Xvfb started with PID $XVFB_PID"
echo "Testing Obsidian launch..."

# Try to launch Obsidian (it will fail without a proper setup, but we're testing if it loads)
timeout 5 obsidian --no-sandbox --version || echo "Obsidian version check completed (exit code: $?)"

# Try to launch Obsidian headless
echo "Attempting to launch Obsidian in headless mode..."
timeout 10 obsidian --no-sandbox --headless 2>&1 | head -20 || echo "Obsidian launch test completed (exit code: $?)"

# Cleanup
echo "Stopping Xvfb..."
kill $XVFB_PID 2>/dev/null || true
wait $XVFB_PID 2>/dev/null || true

echo "Test completed!"
