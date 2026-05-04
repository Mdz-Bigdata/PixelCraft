#!/bin/bash

# ==============================================================================
# PixelCraft Project - One-Click Startup Script
# Supports Python 3.9 to 3.14
# Starts: Python Model Service, Node.js Backend, React Frontend
# ==============================================================================

set -e

echo "=============================================================================="
echo " Starting PixelCraft Project Services..."
echo "=============================================================================="

# 1. Find suitable Python version (3.9 to 3.14)
PYTHON_CMD=""
for py in python3 python3.14 python3.13 python3.12 python3.11 python3.10 python3.9 python; do
    if command -v $py >/dev/null 2>&1; then
        # Check version
        VERSION=$($py -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)
        MAJOR=$(echo $VERSION | cut -d. -f1)
        MINOR=$(echo $VERSION | cut -d. -f2)
        
        if [ "$MAJOR" = "3" ] && [ "$MINOR" -ge 9 ] && [ "$MINOR" -le 14 ]; then
            PYTHON_CMD=$py
            echo "✅ Found suitable Python: $PYTHON_CMD (Version $VERSION)"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Error: Could not find Python version between 3.9 and 3.14."
    echo "Please install a compatible Python version and try again."
    exit 1
fi

# 2. Install Python dependencies
echo "📦 Installing Python dependencies..."
$PYTHON_CMD -m pip install --break-system-packages -r python_service/requirements.txt || $PYTHON_CMD -m pip install -r python_service/requirements.txt

# 3. Start Python Model Service
echo "🚀 Starting Python Model Service (Port 8000)..."
$PYTHON_CMD python_service/main.py &
PYTHON_PID=$!

# 4. Start Node.js Backend
echo "🚀 Starting Node.js Backend (Port 3000)..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!
cd ..

# 5. Start React Frontend
echo "🚀 Starting React Frontend (Port 5173)..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# 6. Setup cleanup handler
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $PYTHON_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "=============================================================================="
echo "✅ All services started successfully!"
echo "🌐 Frontend:         http://localhost:5173"
echo "⚙️  Backend:          http://localhost:3000"
echo "🧠 AI Model Service: http://127.0.0.1:8000"
echo "🛑 Press Ctrl+C to stop all services."
echo "=============================================================================="

# Wait for processes to exit
wait
