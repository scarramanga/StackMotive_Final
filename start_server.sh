#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
cd server
exec venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
