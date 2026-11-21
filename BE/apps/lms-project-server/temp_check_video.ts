import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.lesson.findFirst({where: {title: {contains: 'T-SQL'}}, include: {videos: true}}).then(res => console.log(JSON.stringify(res, null, 2))).finally(() => p.$disconnect());
