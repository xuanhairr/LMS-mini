import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('Restoring data from backup_lms_project.json...');

  const backupPath = 'D:\\DATN\\LMS-mini\\BE\\backup_lms_project.json';
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file not found at ' + backupPath);
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // Clean up existing data
  console.log('Cleaning up old data...');
  for (const model of Object.keys(data)) {
    try {
      await prisma.$runCommandRaw({ drop: model });
      console.log(`Dropped collection ${model}`);
    } catch (e) {
      // Ignore if collection does not exist
    }
  }

  console.log('Inserting data...');
  
  for (const model of Object.keys(data)) {
    const delegate = (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)];
    const records = data[model];
    
    if (delegate && delegate.createMany && records && records.length > 0) {
      try {
        // Remove _id from records if it exists (MongoDB Prisma issue with manual _id)
        const sanitizedRecords = records.map((record: any) => {
          // Keep id but let MongoDB handle _id mapping if necessary, or just insert as is
          // Usually Prisma handles this for createMany
          return record;
        });

        await delegate.createMany({ data: sanitizedRecords });
        console.log(`- Restored ${records.length} records for ${model}`);
      } catch (err: any) {
        console.error(`- Failed to restore ${model}:`, err.message);
      }
    }
  }

  console.log('✅ Restore completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
