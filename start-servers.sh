#!/bin/bash

# Kill any existing node processes
pkill node

# Start the backend server in the background
echo "Starting backend server..."
node app.js &

# Wait a moment for the backend to start
sleep 2

# Start the frontend server
echo "Starting frontend server..."
cd client && npm start 