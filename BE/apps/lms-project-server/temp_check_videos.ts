import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.video.findMany({select: {id: true, url: true, title: true}, take: 5}).then(res => console.log(JSON.stringify(res, null, 2))).finally(() => p.$disconnect());
