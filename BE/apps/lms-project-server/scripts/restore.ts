import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Thứ tự xóa: Con trước, Cha sau (tránh lỗi foreign key nếu có validation)
const deleteOrder = [
  'notification',
  'assignmentSubmission',
  'attendance',
  'progress',
  'quizAttempt',
  'enrollment',
  'question',
  'quiz',
  'video',
  'homework',
  'attachment',
  'lesson',
  'classSchedule',
  'shift',
  'class',
  'course',
  'user',
  'category',
  'role'
];

// Thứ tự thêm: Cha trước, Con sau
const insertOrder = [
  'role',
  'category',
  'user',
  'course',
  'class',
  'shift',
  'classSchedule',
  'lesson',
  'attachment',
  'homework',
  'video',
  'quiz',
  'question',
  'enrollment',
  'quizAttempt',
  'progress',
  'attendance',
  'assignmentSubmission',
  'notification'
];

async function main() {
  // Lấy file backup mới nhất (hoặc chỉ định tên file cụ thể nếu cần)
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    throw new Error('Không tìm thấy thư mục backups!');
  }

  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('Không có file backup nào!');
  }

  // Sắp xếp lấy file mới nhất
  files.sort((a, b) => fs.statSync(path.join(backupDir, b)).mtimeMs - fs.statSync(path.join(backupDir, a)).mtimeMs);
  const latestBackup = files[0];
  const filePath = path.join(backupDir, latestBackup);

  console.log(`Đang đọc file backup: ${latestBackup}...`);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const backupData = JSON.parse(rawData);

  console.log('\n🧹 Đang xóa sạch dữ liệu hiện tại...');
  for (const model of deleteOrder) {
    try {
      // @ts-ignore
      await prisma[model].deleteMany();
      console.log(` -> Đã xóa bảng: ${model}`);
    } catch (e: any) {
      console.log(` -> Bỏ qua xóa bảng: ${model}`);
    }
  }

  console.log('\n📥 Đang phục hồi dữ liệu từ file backup...');
  for (const model of insertOrder) {
    const ModelNameCap = model.charAt(0).toUpperCase() + model.slice(1);
    const records = backupData[ModelNameCap];
    
    if (records && records.length > 0) {
      try {
        if (model === 'user' || model === 'category' || model === 'role') {
          // Bảng User/Category/Role không bị xóa hết, nên cần thêm từng cái để tránh lỗi Unique constraint
          let successCount = 0;
          for (const record of records) {
            const exists = await (prisma[model] as any).findUnique({ where: { id: record.id } });
            if (!exists) {
              await (prisma[model] as any).create({ data: record });
              successCount++;
            }
          }
          console.log(` -> Phục hồi bổ sung thành công ${successCount} bản ghi bị thiếu cho bảng: ${model}`);
        } else {
          // Các bảng khác đã xóa trắng thì createMany bình thường
          // @ts-ignore
          await prisma[model].createMany({ data: records });
          console.log(` -> Phục hồi thành công ${records.length} bản ghi cho bảng: ${model}`);
        }
      } catch (e: any) {
        console.error(` -> LỖI phục hồi bảng ${model}:`, e.message);
      }
    } else {
      console.log(` -> Bỏ qua bảng: ${model} (Không có dữ liệu)`);
    }
  }

  console.log('\n🎉 ĐÃ KHÔI PHỤC DỮ LIỆU THÀNH CÔNG!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
