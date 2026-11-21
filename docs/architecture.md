# Kiến trúc Hệ thống (System Architecture)

Dự án LMS-mini được thiết kế theo mô hình Client-Server với các công nghệ hiện đại. Dưới đây là tổng quan về kiến trúc của hệ thống.

## 1. Frontend (FE)
- **Framework**: React 18
- **Build Tool**: Vite (giúp build và HMR cực nhanh)
- **Ngôn ngữ**: TypeScript
- **Styling**: Tailwind CSS kết hợp với `shadcn-ui` (các component Radix UI) và Ant Design (`antd`).
- **State Management & Data Fetching**: `@tanstack/react-query` (quản lý state server-side), Zustand hoặc Context API (nếu có dùng cho local state).
- **Routing**: `react-router-dom` v6
- **Real-time**: `socket.io-client` để nhận thông báo, cập nhật thời gian thực.
- **Form & Validation**: `react-hook-form` kết hợp với `zod`.

## 2. Backend (BE)
- **Framework**: NestJS (xây dựng theo mô hình module hóa chặt chẽ).
- **Ngôn ngữ**: TypeScript
- **API Paradigm**: GraphQL (sử dụng `@nestjs/graphql` và `@apollo/server`), có thể kết hợp với REST APIs cho một số tác vụ đặc biệt (như upload file, webhooks).
- **ORM & Database**: Prisma ORM (`@prisma/client`) kết nối với PostgreSQL/MySQL (cấu hình qua biến môi trường).
- **Xác thực & Phân quyền**:
  - JWT (JSON Web Token) kết hợp `@nestjs/passport`.
  - Phân quyền (RBAC/ABAC) thông qua `nest-access-control`.
- **Real-time**: `@nestjs/websockets` và `@nestjs/platform-socket.io`.
- **Lưu trữ File**: Tích hợp Cloudinary để lưu trữ hình ảnh/video trực tuyến.
- **Scheduling**: `@nestjs/schedule` (Cron jobs để chạy các tác vụ định kỳ).
- **Bảo mật**: `bcrypt` (mã hóa mật khẩu).

## 3. Kiến trúc Luồng Dữ liệu (Data Flow)
1. **Client (Browser)** gửi yêu cầu (GraphQL Query/Mutation hoặc REST endpoint).
2. **NestJS Server** nhận yêu cầu thông qua các Controller (REST) hoặc Resolver (GraphQL).
3. Các **Guard/Interceptor** kiểm tra xác thực (JWT), phân quyền và log dữ liệu.
4. Yêu cầu được chuyển đến **Service** tương ứng để xử lý nghiệp vụ (Business Logic).
5. Service tương tác với **Prisma Client** để đọc/ghi dữ liệu vào Database.
6. Kết quả được trả về thông qua Resolver/Controller dưới dạng JSON.
7. Đối với các sự kiện theo thời gian thực (như có thông báo mới), **Socket.io Gateway** sẽ push event từ Server về Client.

## 4. Cấu trúc Thư mục (Directory Structure)
- **`FE/`**: Ứng dụng React frontend.
- **`BE/apps/lms-project-server/`**: Ứng dụng NestJS backend.
  - **`src/`**: Mã nguồn backend chính.
    - Chứa các thư mục module (auth, user, course, attendance, quiz...).
    - **`prisma/`**: Schema cơ sở dữ liệu và script backup/restore.
