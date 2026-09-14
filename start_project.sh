#!/bin/bash
# ============================================================================
#  University Help Desk — 1-Click Startup Script (macOS / Linux)
#  Launches both Spring Boot Backend and React Frontend
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================================"
echo "   University Help Desk — Project Startup"
echo "============================================================"
echo ""

# ── Check Java ──
if ! command -v java &> /dev/null; then
    echo "[ERROR] Java is not installed or not in PATH."
    echo "        Please install Java 17 or later from https://adoptium.net"
    exit 1
fi
JAVA_VER=$(java -version 2>&1 | head -1 | awk -F'"' '{print $2}')
echo "[OK] Java found: $JAVA_VER"

# ── Check Node.js ──
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "        Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VER=$(node -v)
echo "[OK] Node.js found: $NODE_VER"

# ── Check npm ──
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed."
    exit 1
fi
echo "[OK] npm found: $(npm -v)"

echo ""
echo "============================================================"
echo "   Starting Backend (Spring Boot on port 8080)..."
echo "============================================================"

# ── Launch Backend in background ──
cd "$SCRIPT_DIR/BackEnd"
chmod +x mvnw 2>/dev/null || true

if [ -f "./mvnw" ]; then
    ./mvnw spring-boot:run &
else
    mvn spring-boot:run &
fi
BACKEND_PID=$!
echo "[OK] Backend started (PID: $BACKEND_PID)"

# ── Install npm packages if needed ──
cd "$SCRIPT_DIR/FrontEnd"
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules not found. Running npm install..."
    npm install
    echo "[OK] npm install completed."
fi

echo ""
echo "============================================================"
echo "   Starting Frontend (React on port 5173)..."
echo "============================================================"

npm run dev &
FRONTEND_PID=$!
echo "[OK] Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "============================================================"
echo "   Both servers are running!"
echo "   Backend:  http://localhost:8080/api"
echo "   Frontend: http://localhost:5173"
echo ""
echo "   Press Ctrl+C to stop both servers."
echo "============================================================"

# Wait for both processes; stop both on Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
