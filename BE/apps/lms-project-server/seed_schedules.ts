import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const CLASSES = [
  { id: '6a357263b18f34c982a37d90', title: 'CSDL-K01',     dayOfWeek: [2, 4],    shift: 'CA1', startTime: '06:30', endTime: '08:30' },
  { id: '6a357263b18f34c982a37d91', title: 'CSDL-K02',     dayOfWeek: [3, 5],    shift: 'CA2', startTime: '08:45', endTime: '10:45' },
  { id: '6a357263b18f34c982a37d92', title: 'CSDL-K03',     dayOfWeek: [2, 6],    shift: 'CA3', startTime: '11:00', endTime: '13:00' },
  { id: '6a357263b18f34c982a37d93', title: 'CSDL-K04',     dayOfWeek: [4],       shift: 'CA4', startTime: '13:30', endTime: '15:30' },
  { id: '6a357263b18f34c982a37d94', title: 'REACT-K01',    dayOfWeek: [2, 5],    shift: 'CA1', startTime: '06:30', endTime: '08:30' },
  { id: '6a357263b18f34c982a37d95', title: 'REACT-K02',    dayOfWeek: [3, 6],    shift: 'CA3', startTime: '11:00', endTime: '13:00' },
  { id: '6a357263b18f34c982a37d96', title: 'REACT-K03',    dayOfWeek: [4, 7],    shift: 'CA5', startTime: '15:45', endTime: '17:45' },
  { id: '6a357263b18f34c982a37d97', title: 'FLUTTER-K01',  dayOfWeek: [3, 5],    shift: 'CA2', startTime: '08:45', endTime: '10:45' },
  { id: '6a357263b18f34c982a37d98', title: 'FLUTTER-K02',  dayOfWeek: [2, 4, 6], shift: 'CA4', startTime: '13:30', endTime: '15:30' },
  { id: '6a357263b18f34c982a37d99', title: 'FLUTTER-K03',  dayOfWeek: [3, 7],    shift: 'CA6', startTime: '18:00', endTime: '20:00' },
];

async function main() {
  for (const cls of CLASSES) {
    const existing = await p.classSchedule.findUnique({ where: { classId: cls.id } });
    if (existing) {
      await p.classSchedule.update({
        where: { classId: cls.id },
        data: { dayOfWeek: cls.dayOfWeek, shift: cls.shift, startTime: cls.startTime, endTime: cls.endTime },
      });
      console.log(`Updated: ${cls.title}`);
    } else {
      await p.classSchedule.create({
        data: { classId: cls.id, dayOfWeek: cls.dayOfWeek, shift: cls.shift, startTime: cls.startTime, endTime: cls.endTime },
      });
      console.log(`Created: ${cls.title}`);
    }
  }
  console.log('\n✅ All class schedules created!');
}

main().catch(console.error).finally(() => p.$disconnect());
