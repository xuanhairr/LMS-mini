import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding REALISTIC Quizzes and Homeworks...');

  const courses = await prisma.course.findMany({
    where: {
      title: {
        in: ['Fullstack ReactJS & NodeJS', 'Xây dựng App với Flutter']
      }
    },
    include: {
      lessons: {
        include: {
          quizzes: true,
          homeworks: true,
        }
      }
    }
  });

  let quizCount = 0;
  let hwCount = 0;

  for (const course of courses) {
    for (const lesson of course.lessons) {
      // 1. Clear old dummy quizzes and homeworks
      if (lesson.quizzes.length > 0) {
        for (const q of lesson.quizzes) {
          await prisma.quiz.delete({ where: { id: q.id } });
        }
      }
      if (lesson.homeworks.length > 0) {
        for (const hw of lesson.homeworks) {
          await prisma.homework.delete({ where: { id: hw.id } });
        }
      }

      // 2. Generate realistic data based on lesson title
      const titleLower = lesson.title?.toLowerCase() || '';

      if (titleLower.includes('tổng quan reactjs')) {
        await prisma.quiz.create({
          data: {
            title: 'Trắc nghiệm: Tổng quan ReactJS',
            lessonId: lesson.id,
            questions: {
              create: [
                {
                  content: 'JSX trong React là viết tắt của từ gì?',
                  options: ['JavaScript XML', 'Java Syntax Extension', 'JSON Syntax eXtension', 'JavaScript X-DOM'],
                  correctAnswer: 0,
                  order: 1
                },
                {
                  content: 'React sử dụng cơ chế nào để tối ưu hóa hiệu suất render?',
                  options: ['Real DOM', 'Virtual DOM', 'Shadow DOM', 'Document Fragment'],
                  correctAnswer: 1,
                  order: 2
                }
              ]
            }
          }
        });
        await prisma.homework.create({
          data: {
            title: 'Bài tập: Component đầu tiên',
            description: '<p>Yêu cầu: Hãy tạo một Functional Component hiển thị "Hello World", sử dụng TailwindCSS để căn giữa màn hình và đổi màu chữ thành đỏ. Nộp link Github repository.</p>',
            level: 'Cơ bản',
            order: 1,
            lessonId: lesson.id
          }
        });
        quizCount++; hwCount++;
      } 
      else if (titleLower.includes('react hooks')) {
        await prisma.quiz.create({
          data: {
            title: 'Trắc nghiệm: React Hooks',
            lessonId: lesson.id,
            questions: {
              create: [
                {
                  content: 'Hook nào sau đây dùng để quản lý trạng thái (state) trong Functional Component?',
                  options: ['useEffect', 'useReducer', 'useState', 'useContext'],
                  correctAnswer: 2,
                  order: 1
                },
                {
                  content: 'Hàm useEffect(..., []) với dependency array rỗng sẽ chạy khi nào?',
                  options: ['Chạy mỗi khi component re-render', 'Chỉ chạy 1 lần duy nhất sau lần render đầu tiên (mount)', 'Chạy trước khi component render', 'Chạy khi component unmount'],
                  correctAnswer: 1,
                  order: 2
                }
              ]
            }
          }
        });
        await prisma.homework.create({
          data: {
            title: 'Bài tập: Todo List cơ bản',
            description: '<p>Yêu cầu: Viết một ứng dụng Todo List đơn giản có các chức năng: Thêm việc, Xóa việc, Đánh dấu hoàn thành. Bắt buộc phải sử dụng useState. Chấm điểm dựa trên tính năng và giao diện sạch sẽ.</p>',
            level: 'Khá',
            order: 1,
            lessonId: lesson.id
          }
        });
        quizCount++; hwCount++;
      }
      else if (titleLower.includes('nodejs cơ bản')) {
        await prisma.quiz.create({
          data: {
            title: 'Kiểm tra kiến thức NodeJS',
            lessonId: lesson.id,
            questions: {
              create: [
                {
                  content: 'Node.js được xây dựng dựa trên JavaScript engine nào?',
                  options: ['SpiderMonkey', 'V8 Engine', 'Chakra', 'JavaScriptCore'],
                  correctAnswer: 1,
                  order: 1
                }
              ]
            }
          }
        });
        await prisma.homework.create({
          data: {
            title: 'Thực hành: Xây dựng RESTful API',
            description: '<p>Sử dụng Express.js, hãy tạo các API: GET /users, POST /users, PUT /users/:id, DELETE /users/:id. Data tạm thời lưu trong mảng RAM (in-memory).</p>',
            level: 'Trung bình',
            order: 1,
            lessonId: lesson.id
          }
        });
        quizCount++; hwCount++;
      }
      else if (titleLower.includes('kết nối database')) {
        await prisma.homework.create({
          data: {
            title: 'Thực hành: Tích hợp MongoDB và Prisma',
            description: '<p>Tiếp tục project ở bài trước, tiến hành cài đặt Prisma, kết nối với MongoDB Cloud và chuyển đổi in-memory array thành Database thao tác thực tế.</p>',
            level: 'Khá',
            order: 1,
            lessonId: lesson.id
          }
        });
        hwCount++;
      }
      else if (titleLower.includes('cài đặt môi trường') && titleLower.includes('flutter')) {
        await prisma.quiz.create({
          data: {
            title: 'Trắc nghiệm: Tổng quan Flutter',
            lessonId: lesson.id,
            questions: {
              create: [
                {
                  content: 'Flutter sử dụng ngôn ngữ lập trình nào để viết code?',
                  options: ['Java', 'Kotlin', 'Dart', 'Swift'],
                  correctAnswer: 2,
                  order: 1
                },
                {
                  content: 'Lệnh nào dùng để kiểm tra môi trường Flutter đã cài đặt đúng chưa?',
                  options: ['flutter check', 'flutter init', 'flutter doctor', 'flutter run'],
                  correctAnswer: 2,
                  order: 2
                }
              ]
            }
          }
        });
        await prisma.homework.create({
          data: {
            title: 'Bài tập: Counter App',
            description: '<p>Tạo project Flutter đầu tiên. Chạy ứng dụng Counter app mặc định lên máy ảo (Emulator/Simulator) và chụp ảnh màn hình nộp lên hệ thống.</p>',
            level: 'Cơ bản',
            order: 1,
            lessonId: lesson.id
          }
        });
        quizCount++; hwCount++;
      }
      else if (titleLower.includes('widgets cơ bản')) {
         await prisma.quiz.create({
          data: {
            title: 'Trắc nghiệm: Stateless vs Stateful',
            lessonId: lesson.id,
            questions: {
              create: [
                {
                  content: 'Widget nào không thể thay đổi trạng thái sau khi đã được khởi tạo?',
                  options: ['StatefulWidget', 'StatelessWidget', 'InheritedWidget', 'MaterialApp'],
                  correctAnswer: 1,
                  order: 1
                }
              ]
            }
          }
        });
        await prisma.homework.create({
          data: {
            title: 'Thực hành xếp Layout',
            description: '<p>Sử dụng Row, Column và Container để dựng lại giao diện một thẻ thông tin cá nhân (Profile Card) cơ bản.</p>',
            level: 'Khá',
            order: 1,
            lessonId: lesson.id
          }
        });
        quizCount++; hwCount++;
      }
    }
  }

  console.log(`Finished replacing realistic data! Created ${quizCount} quizzes and ${hwCount} homeworks.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
