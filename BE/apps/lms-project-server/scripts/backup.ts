import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Đang tiến hành sao lưu (backup) dữ liệu...');
  const backupData: any = {};
  
  // Lấy danh sách tất cả các bảng (models) từ Prisma
  const models = Prisma.dmmf.datamodel.models.map(m => m.name);
  
  for (const model of models) {
    // Chữ cái đầu tiên viết thường để gọi prisma[modelName]
    const modelDelegateName = model.charAt(0).toLowerCase() + model.slice(1);
    
    console.log(`Đang sao lưu bảng: ${model}...`);
    try {
      // @ts-ignore
      const records = await prisma[modelDelegateName].findMany();
      backupData[model] = records;
      console.log(` -> Đã lưu ${records.length} bản ghi.`);
    } catch (e) {
      console.error(` -> Lỗi khi sao lưu bảng ${model}:`, e);
    }
  }

  // Tạo thư mục backups nếu chưa có
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  // Đặt tên file backup theo thời gian
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupDir, `backup_${timestamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\n🎉 SAO LƯU HOÀN TẤT!`);
  console.log(`📁 File backup được lưu tại: ${filePath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
