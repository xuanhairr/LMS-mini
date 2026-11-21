import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const oldUrl = 'https://res.cloudinary.com/do5mbz6wl/video/upload/v1779508643/id9zsl2nkmapmbgp41sm.mp4';
  const newUrl = 'https://res.cloudinary.com/do5mbz6wl/video/upload/v1781891539/IOC-BE-101-_CSDL_Session01-_lesson03__H%E1%BB%87_qu%E1%BA%A3n_tr%E1%BB%8B_c%C6%A1_s%E1%BB%9F_d%E1%BB%AF_li%E1%BB%87u_PostgeSQL_xcf9df.mp4';

  const result = await p.video.updateMany({
    where: { url: oldUrl },
    data: { url: newUrl }
  });

  console.log(`Updated ${result.count} video(s) with the new URL.`);
}

main().catch(console.error).finally(() => p.$disconnect());
