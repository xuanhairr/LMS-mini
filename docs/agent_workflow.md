# Quy trình Phát triển Định hướng Agent (Agent Driven Development - ADD)

Trong Agent Driven Development (ADD), việc duy trì tài liệu (documentation) không chỉ dành cho con người mà còn cung cấp ngữ cảnh (context) tối quan trọng cho các AI Agent hỗ trợ lập trình (như Github Copilot, Cline, Antigravity, v.v.).

Để hệ thống hoạt động trơn tru và Agent hiểu rõ yêu cầu, mọi tính năng mới hoặc thay đổi lớn đều phải tuân thủ quy trình sau.

## 1. Nguyên tắc cốt lõi
- **Documentation First (hoặc Docs in Sync)**: Trước khi (hoặc ngay trong quá trình) viết code cho một tính năng mới, tài liệu định nghĩa tính năng đó phải được tạo/cập nhật dưới dạng Markdown trong thư mục `docs/`.
- **Rõ ràng, Cấu trúc, Dễ parse**: Sử dụng các định dạng chuẩn Markdown (Heading, List, Code block, Bold) để Agent có thể dễ dàng đọc và trích xuất thông tin.
- **Một Nguồn Chân Lý (Single Source of Truth)**: Tài liệu trong thư mục `docs/` luôn phản ánh đúng nhất về cấu trúc code hiện tại. Nếu code thay đổi, docs phải được thay đổi tương ứng.

## 2. Quy trình Cập nhật & Thêm Tính năng Mới
Khi bạn yêu cầu Agent (hoặc tự code) một tính năng mới, hãy thực hiện theo các bước:

### Bước 1: Khởi tạo Specs trong `docs/features/`
- Tạo một file mới (ví dụ `docs/features/payment.md`) nếu đây là module hoàn toàn mới.
- Hoặc mở file feature đã có (ví dụ `docs/features/course.md`) để bổ sung.
- Định nghĩa rõ:
  - **Mô tả tính năng** (What & Why).
  - **Database Models** (Các entity mới, bảng mới cần tạo).
  - **API/GraphQL Specs** (Các Query/Mutation dự kiến).
  - **Frontend UI/UX** (Luồng tương tác của người dùng).

### Bước 2: Yêu cầu Agent thực thi
- Chỉ định Agent đọc file Specs vừa tạo.
  - Ví dụ prompt: *"Hãy đọc file `docs/features/payment.md` và implement tính năng này ở cả Backend (tạo Prisma model, Resolver, Service) và Frontend (Tạo giao diện quản lý thanh toán)."*
- Agent sẽ dựa vào specs chuẩn mực để viết code chính xác hơn, không bị thiếu sót logic.

### Bước 3: Cập nhật Changelog
- Sau khi code hoàn tất và test thành công, ghi log lại tại `docs/changelog.md` với ngày tháng và nội dung cụ thể.
- Nếu có cập nhật cấu trúc database, cập nhật lại phần Database Models trong các file `.md` liên quan.

## 3. Lợi ích của ADD
- Giảm thiểu việc Agent "ảo giác" (hallucinate) sinh ra code không đúng định hướng kiến trúc.
- Giữ cho codebase luôn sạch và dễ dàng bàn giao (onboarding) cho developer mới.
- Dễ dàng tạo các script CI/CD dựa trên tài liệu.
