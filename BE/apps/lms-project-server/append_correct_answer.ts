import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const questions = await p.question.findMany();

  for (const q of questions) {
    if (!q.options || !Array.isArray(q.options)) continue;
    
    let updated = false;
    const newOptions = q.options.map((opt: any, index: number) => {
      let optStr = String(opt);
      // Remove any existing (Đúng) mark just in case
      optStr = optStr.replace(/\s*\(Đúng\)$/, '');
      
      if (index === q.correctAnswer) {
        updated = true;
        return `${optStr} (Đúng)`;
      }
      return optStr;
    });

    if (updated) {
      await p.question.update({
        where: { id: q.id },
        data: { options: newOptions }
      });
    }
  }

  console.log('Appended "(Đúng)" to all correct answers.');
}

main().catch(console.error).finally(() => p.$disconnect());
