#!/bin/bash

# Check MongoDB status and start if needed
if ! systemctl is-active --quiet mongodb; then
    echo "Starting MongoDB..."
    sudo systemctl start mongodb
    sleep 3  # Wait for MongoDB to fully start
fi

# Verify MongoDB connection
if ! mongosh --eval "db.adminCommand('ping')" > /dev/null; then
    echo "Error: Cannot connect to MongoDB"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Start backend server
echo "Starting backend server..."
HOST=0.0.0.0 npm run dev &

# Wait for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server..."
cd client && npm start

# Keep script running
wait 