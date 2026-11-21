import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const p = new PrismaClient();

async function main() {
  const models = Prisma.dmmf.datamodel.models.map(m => m.name);
  const backupData: any = {};

  for (const model of models) {
    const delegate = (p as any)[model.charAt(0).toLowerCase() + model.slice(1)];
    if (delegate && delegate.findMany) {
      console.log(`Exporting ${model}...`);
      const data = await delegate.findMany();
      backupData[model] = data;
    }
  }

  const backupPath = path.join(__dirname, '..', '..', 'backup_lms_project.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`Backup successfully created at: ${backupPath}`);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
