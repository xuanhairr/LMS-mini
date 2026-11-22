# 🚀 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG LMS-MINI LÊN MÁY CHỦ (PRODUCTION DEPLOYMENT GUIDE)

Tài liệu này hướng dẫn chi tiết từ A đến Z quy trình triển khai hệ thống **LMS-mini** lên Cloud Server / VPS (Ubuntu 22.04 / 24.04 LTS) sử dụng kiến trúc Container hóa **Docker & Docker Compose**, bảo mật kết nối với **HTTPS (SSL Let's Encrypt)** và tự động hóa sao lưu dữ liệu.

---

## 📌 MỤC LỤC
1. [Yêu cầu hạ tầng & Phần cứng](#1-yêu-cầu-hạ-tầng--phần-cứng)
2. [Cài đặt môi trường ban đầu trên Server](#2-cài-đặt-môi-trường-ban-đầu-trên-server)
3. [Tải mã nguồn & Cấu hình Biến môi trường](#3-tải-mã-nguồn--cấu-hình-biến-môi-trường)
4. [Khởi chạy hệ thống bằng Docker Compose](#4-khởi-chạy-hệ-thống-bằng-docker-compose)
5. [Cấu hình Tên miền (Domain) & Chứng chỉ HTTPS (SSL)](#5-cấu-hình-tên-miền-domain--chứng-chỉ-https-ssl)
6. [Tự động hóa sao lưu dữ liệu (Automated Backup)](#6-tự-động-hóa-sao-lưu-dữ-liệu-automated-backup)
7. [Quy trình cập nhật hệ thống (Update / CI-CD)](#7-quy-trình-cập-nhật-hệ-thống-update--ci-cd)
8. [Xử lý sự cố thường gặp (Troubleshooting)](#8-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Yêu cầu hạ tầng & Phần cứng

* **Hệ điều hành khuyến nghị:** Ubuntu 22.04 LTS hoặc Ubuntu 24.04 LTS (64-bit).
* **Cấu hình tối thiểu (Dành cho Demo / Dưới 200 học viên):**
  * **CPU:** 2 vCPU
  * **RAM:** 4GB RAM (Hoặc 2GB RAM vật lý + 2GB Swap Memory)
  * **Ổ cứng:** 30GB SSD / NVMe
* **Cấu hình khuyến nghị (Dành cho vận hành thực tế):**
  * **CPU:** 4 vCPU
  * **RAM:** 8GB RAM
  * **Ổ cứng:** 50GB SSD
* **Tên miền (Domain Name):** Ví dụ: `lms.example.com` (Đã trỏ bản ghi `A` về địa chỉ Public IP của Server).

---

## 2. Cài đặt môi trường ban đầu trên Server

Đăng nhập vào VPS qua SSH bằng tài khoản root:
```bash
ssh root@<IP_SERVER_CỦA_BẠN>
```

### Bước 2.1: Cập nhật hệ thống & Tạo bộ nhớ ảo (Swap)
Nếu server có 2GB - 4GB RAM, nên bật 4GB Swap để tránh tình trạng tràn RAM khi build container:
```bash
# Cập nhật các gói phần mềm
apt update && apt upgrade -y

# Tạo 4GB Swap
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Cài đặt các công cụ bổ trợ cần thiết
apt install -y git curl wget ufw htop
```

### Bước 2.2: Cài đặt Docker & Docker Compose
Sử dụng script chính thức của Docker:
```bash
# Cài đặt Docker engine
curl -fsSL https://get.docker.com | sh

# Bật Docker tự khởi động cùng OS
systemctl enable docker
systemctl start docker

# Kiểm tra phiên bản
docker --version
docker compose version
```

### Bước 2.3: Thiết lập Tường lửa (UFW Firewall)
Mở các port thiết yếu và kích hoạt tường lửa:
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

---

## 3. Tải mã nguồn & Cấu hình Biến môi trường

### Bước 3.1: Clone Repository về thư mục vận hành
```bash
mkdir -p /var/www
cd /var/www

# Clone mã nguồn dự án của bạn từ GitHub
git clone https://github.com/<your-username>/LMS-mini.git
cd LMS-mini
```

### Bước 3.2: Tạo file `.env` cho Production
Tại thư mục gốc `/var/www/LMS-mini`, tạo file `.env`:
```bash
nano .env
```
Dán cấu hình sản xuất sau vào (thay thế bằng thông tin thực tế của bạn):
```env
# Môi trường
NODE_ENV=production
PORT=3000

# Khóa bí mật JWT (Tạo chuỗi ngẫu nhiên bằng lệnh: openssl rand -hex 32)
JWT_SECRET_KEY=9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b
BCRYPT_SALT=10

# Cấu hình Gửi Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Cấu hình Lưu trữ Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Cấu hình Trợ lý AI (Google Gemini API)
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
```
*Nhấn `Ctrl + O` -> `Enter` để lưu, sau đó `Ctrl + X` để thoát.*

---

## 4. Khởi chạy hệ thống bằng Docker Compose

Hệ thống đã tích hợp sẵn file `docker-compose.yml` điều phối toàn bộ:
- **db:** MongoDB 6.0 với Replica Set `rs0` + Healthcheck.
- **backend:** NestJS Server chạy nội bộ trên port `3000`.
- **frontend:** React SPA build tối ưu, phục vụ qua Nginx trên port `80`.

Khởi chạy bằng một lệnh duy nhất:
```bash
docker compose up -d --build
```

### Kiểm tra trạng thái hệ thống:
```bash
# Xem các container đang chạy
docker compose ps

# Xem log thời gian thực của backend
docker compose logs -f backend

# Xem log của database
docker compose logs -f db
```

### Khởi tạo dữ liệu mẫu (Seed Data - Lần đầu triển khai):
```bash
docker compose exec backend npm run seed
```

---

## 5. Cấu hình Tên miền (Domain) & Chứng chỉ HTTPS (SSL)

Để trang web hiển thị ổ khóa xanh an toàn (`https://lms.yourdomain.com`), bạn có thể dùng một trong hai phương án phổ biến sau:

### Phương án A: Dùng Cloudflare Proxy (Dễ nhất & Miễn phí)
1. Thêm Domain của bạn vào Cloudflare.
2. Thêm bản ghi `A` với tên miền `lms` trỏ về IP của Server.
3. Bật biểu tượng đám mây màu cam (**Proxied**).
4. Vào mục **SSL/TLS** chọn chế độ **Flexible** hoặc **Full**.
5. *Xong ngay trong 2 phút mà không cần cài đặt Certbot!*

---

### Phương án B: Cài Nginx Reverse Proxy & Certbot trực tiếp trên Server Host

Nếu muốn tự quản lý chứng chỉ SSL của Let's Encrypt:

#### 1. Đổi port frontend trong `docker-compose.yml`
Sửa port frontend từ `"80:80"` thành `"8080:80"` để nhường port `80` và `443` cho Nginx Host:
```yaml
  frontend:
    ports:
      - "8080:80"
```
Chạy lại: `docker compose up -d`

#### 2. Cài đặt Nginx & Certbot trên Ubuntu
```bash
apt install -y nginx certbot python3-certbot-nginx
```

#### 3. Tạo cấu hình Virtual Host cho domain
```bash
nano /etc/nginx/sites-available/lms.conf
```
Nội dung file:
```nginx
server {
    server_name lms.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Kích hoạt cấu hình:
```bash
ln -s /etc/nginx/sites-available/lms.conf /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 4. Kích hoạt chứng chỉ HTTPS (Let's Encrypt)
```bash
certbot --nginx -d lms.yourdomain.com
```
Làm theo hướng dẫn trên màn hình (nhập email và đồng ý điều khoản). Certbot sẽ tự động cấu hình SSL và tạo lịch tự gia hạn chứng chỉ khi hết hạn.

---

## 6. Tự động hóa sao lưu dữ liệu (Automated Backup)

Dữ liệu học viên, khóa học và điểm số là tài sản quan trọng nhất. Cần thiết lập tự động sao lưu hàng ngày.

### Bước 6.1: Tạo thư mục chứa bản sao lưu
```bash
mkdir -p /var/backups/lms_mongodb
```

### Bước 6.2: Tạo Script sao lưu
Tạo file `/var/www/LMS-mini/backup.sh`:
```bash
nano /var/www/LMS-mini/backup.sh
```
Nội dung script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/lms_mongodb"

# Thực hiện dump MongoDB từ container
docker compose exec -T db mongodump --archive > "$BACKUP_DIR/lms_backup_$DATE.archive"

# Xóa các file sao lưu cũ hơn 14 ngày để tiết kiệm dung lượng ổ cứng
find $BACKUP_DIR -type f -name "*.archive" -mtime +14 -exec rm {} \;

echo "Backup completed: lms_backup_$DATE.archive"
```
Cấp quyền thực thi:
```bash
chmod +x /var/www/LMS-mini/backup.sh
```

### Bước 6.3: Thiết lập Cronjob chạy tự động lúc 2:00 sáng hàng ngày
```bash
crontab -e
```
Thêm dòng sau vào cuối file:
```cron
0 2 * * * /bin/bash /var/www/LMS-mini/backup.sh >> /var/log/lms_backup.log 2>&1
```

### Khôi phục dữ liệu (Khi cần Restore):
```bash
cat /var/backups/lms_mongodb/lms_backup_YYYYMMDD_HHMMSS.archive | docker compose exec -T db mongorestore --archive --drop
```

---

## 7. Quy trình cập nhật hệ thống (Update / CI-CD)

Khi bạn đẩy code mới lên GitHub, việc cập nhật mã nguồn trên server diễn ra rất nhanh chóng nhờ Docker:

Tại thư mục `/var/www/LMS-mini`, chạy file `deploy.sh`:
```bash
chmod +x deploy.sh
./deploy.sh
```
Script này sẽ tự động:
1. `git pull origin main` (kéo mã nguồn mới nhất).
2. `docker compose up -d --build` (tự động build lại các image có thay đổi).
3. `docker image prune -f` (dọn dẹp các image cũ để không tốn ổ cứng).

---

## 8. Xử lý sự cố thường gặp (Troubleshooting)

| Sự cố | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Không tải được trang web** | Container chưa chạy hoặc cổng bị firewall chặn | Kiểm tra `docker compose ps`. Mở cổng UFW: `ufw allow 80` & `ufw allow 443`. |
| **Lỗi MongoDB Replica Set** | Container MongoDB chưa hoàn tất khởi tạo cụm | Kiểm tra `docker compose logs db`. Đảm bảo healthcheck trong docker-compose trả về healthy. |
| **Lỗi Upload ảnh / tài liệu (413 hoặc 500)** | Nginx giới hạn dung lượng upload hoặc thiếu quyền thư mục | Thêm `client_max_body_size 50M;` vào Nginx. Cấp quyền thư mục: `chmod -R 777 uploads`. |
| **Server bị đơ khi build frontend** | Hết RAM (Out of Memory) | Kiểm tra bằng lệnh `free -h`. Bật thêm Swap Memory theo Bước 2.1. |
| **Không gửi được email OTP** | Sai thông tin Gmail App Password hoặc bị Google chặn IP lạ | Kiểm tra `EMAIL_USER` và `EMAIL_PASS`. Vào tài khoản Google cho phép ứng dụng truy cập. |

---

*Tài liệu được biên soạn phục vụ đồ án tốt nghiệp và vận hành thực tế hệ thống LMS-mini.*
