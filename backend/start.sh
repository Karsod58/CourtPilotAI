#!/bin/bash
echo "Starting CourtPilot Backend..."
echo "Python version:"
python --version
echo "Current directory:"
pwd
echo "Directory contents:"
ls -la
echo "App directory contents:"
ls -la app/
echo "Starting uvicorn..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
