#!/bin/bash
cd "$(dirname "$0")"

echo "=== Timekettle 开发模式 ==="
echo ""

# Start backend
echo "启动后端 (端口 8000)..."
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

sleep 1

# Start frontend dev server
echo "启动前端 (端口 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "  前端地址: http://localhost:5173"
echo "  后端地址: http://localhost:8000"
echo "  管理员: \${ADMIN_USER_ID:-admin} / \${ADMIN_PASSWORD:-admin123}（首次启动且数据库无该账号时生效）"
echo ""
echo "  按 Ctrl+C 停止"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
