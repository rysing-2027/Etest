#!/bin/bash
cd "$(dirname "$0")"

echo "=== Timekettle 翻译引擎测评系统 ==="
echo ""

# Build frontend
echo "[1/3] 构建前端..."
cd frontend
npm run build --silent
cd ..

# Start backend
echo "[2/3] 启动后端服务..."
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "[3/3] 系统启动完成！"
echo ""
echo "  访问地址: http://localhost:8000"
echo "  管理员账号: \${ADMIN_USER_ID:-admin}"
echo "  管理员密码: \${ADMIN_PASSWORD:-admin123}（首次启动且数据库无该账号时生效）"
echo ""
echo "  按 Ctrl+C 停止服务"

wait $BACKEND_PID
