import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/vi';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const NUM_STUDENTS = 30;
const NUM_TEACHERS = 5;
const NUM_STAFFS = 2;
const NUM_CLASSES = 10;

async function main() {
  console.log('Bắt đầu tạo dữ liệu fake...');

  // Đọc backup để lấy các dữ liệu gốc (nếu có)
  const backupPath = path.join(__dirname, 'backup.json');
  let backupData: any = {};
  if (fs.existsSync(backupPath)) {
    backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  }

  const courses = backupData.courses || [];
  if (courses.length === 0) {
    console.warn('Cảnh báo: Không có khóa học nào trong backup.json. Script sẽ bỏ qua phần tạo Lớp học.');
  }

  const defaultPassword = await bcrypt.hash('123456', 10);
  
  // 1. Tạo Users
  console.log('Đang tạo Học viên...');
  const newStudents = [];
  for (let i = 0; i < NUM_STUDENTS; i++) {
    const user = await prisma.user.create({
      data: {
        username: `student_${faker.internet.username().toLowerCase()}_${i}`,
        email: faker.internet.email(),
        password: defaultPassword,
        fullName: faker.person.fullName(),
        phoneNumber: faker.phone.number(),
        roles: ['STUDENT'],
        forcePasswordChange: false,
        isEmailVerified: true,
        avatar: faker.image.avatar(),
        status: 'active',
      }
    });
    newStudents.push(user);
  }

  console.log('Đang tạo Giảng viên...');
  const newTeachers = [];
  for (let i = 0; i < NUM_TEACHERS; i++) {
    const user = await prisma.user.create({
      data: {
        username: `teacher_${faker.internet.username().toLowerCase()}_${i}`,
        email: faker.internet.email(),
        password: defaultPassword,
        fullName: faker.person.fullName(),
        phoneNumber: faker.phone.number(),
        roles: ['TEACHER'],
        forcePasswordChange: false,
        isEmailVerified: true,
        avatar: faker.image.avatar(),
        status: 'active',
      }
    });
    newTeachers.push(user);
  }

  console.log('Đang tạo Giáo vụ...');
  const newStaffs = [];
  for (let i = 0; i < NUM_STAFFS; i++) {
    const user = await prisma.user.create({
      data: {
        username: `staff_${faker.internet.username().toLowerCase()}_${i}`,
        email: faker.internet.email(),
        password: defaultPassword,
        fullName: faker.person.fullName(),
        phoneNumber: faker.phone.number(),
        roles: ['STAFF'],
        forcePasswordChange: false,
        isEmailVerified: true,
        avatar: faker.image.avatar(),
        status: 'active',
      }
    });
    newStaffs.push(user);
  }

  // 2. Tạo Classes
  const newClasses = [];
  if (courses.length > 0) {
    console.log('Đang tạo Lớp học...');
    for (let i = 0; i < NUM_CLASSES; i++) {
      const course = faker.helpers.arrayElement(courses) as any;
      const teacher = faker.helpers.arrayElement(newTeachers);
      const manager = faker.helpers.arrayElement(newStaffs);
      
      const startDate = faker.date.future({ years: 0.5 });
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3);

      const cls = await prisma.class.create({
        data: {
          title: `${course.title || 'Lớp'} - ${faker.string.alphanumeric({ length: 4, casing: 'upper' })}`,
          courseId: course.id,
          teacherId: teacher.id,
          managerId: manager.id,
          status: faker.helpers.arrayElement(['gathering', 'ready', 'active']),
          startDate,
          endDate,
          sessionCount: course.lessonCount || 10,
        }
      });
      
      // Tạo lịch học
      await prisma.classSchedule.create({
        data: {
          classId: cls.id,
          dayOfWeek: faker.helpers.arrayElements([2, 3, 4, 5, 6, 7, 8], 2),
          shift: faker.helpers.arrayElement(['CA1', 'CA2', 'CA3']),
          startTime: '18:00',
          endTime: '20:00',
        }
      });

      newClasses.push(cls);
    }

    // 3. Fake Enrollments
    console.log('Đang thêm học viên vào lớp...');
    for (const cls of newClasses) {
      // Chọn ngẫu nhiên 5-15 học viên cho mỗi lớp
      const numStudentsInClass = faker.number.int({ min: 5, max: 15 });
      const selectedStudents = faker.helpers.arrayElements(newStudents, numStudentsInClass);
      
      for (const student of selectedStudents) {
        await prisma.enrollment.create({
          data: {
            classId: cls.id,
            courseId: cls.courseId,
            studentId: student.id,
            status: 'active',
          }
        });
      }
    }
  }

  console.log('Tạo dữ liệu fake thành công!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
