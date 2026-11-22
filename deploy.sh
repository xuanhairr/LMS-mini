#!/bin/bash
# ==========================================================
# LMS-MINI AUTOMATED PRODUCTION DEPLOYMENT / UPDATE SCRIPT
# ==========================================================

set -e

echo "🚀 [1/4] Kéo mã nguồn mới nhất từ GitHub..."
git pull origin main

echo "🐳 [2/4] Khởi tạo và build lại các container Docker..."
docker compose up -d --build

echo "🧹 [3/4] Dọn dẹp Docker images cũ không sử dụng..."
docker image prune -f

echo "📋 [4/4] Trạng thái các container hiện tại:"
docker compose ps

echo "✅ Triển khai hoàn tất thành công!"
