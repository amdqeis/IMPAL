#!/bin/bash

echo "Starting backend and frontend..."

# Start Backend
cd backend || exit
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --no-access-log &

# Balik ke root
cd ..

# Start Frontend
cd frontend || exit
npm run dev &

# Menunggu semua proses
wait
