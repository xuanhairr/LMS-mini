#!/bin/bash
# ==========================================================
# LMS-MINI AUTOMATED MONGODB BACKUP SCRIPT
# ==========================================================

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/lms_mongodb"

mkdir -p "$BACKUP_DIR"

echo "💾 Đang sao lưu cơ sở dữ liệu MongoDB..."
docker compose exec -T db mongodump --archive > "$BACKUP_DIR/lms_backup_$DATE.archive"

# Xóa các bản sao lưu cũ hơn 14 ngày để bảo toàn dung lượng đĩa
find "$BACKUP_DIR" -type f -name "*.archive" -mtime +14 -exec rm {} \;

echo "✅ Bản sao lưu đã được tạo tại: $BACKUP_DIR/lms_backup_$DATE.archive"
