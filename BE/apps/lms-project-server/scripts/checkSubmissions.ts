import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.assignmentSubmission.findMany().then(console.log).finally(() => p.$disconnect());
