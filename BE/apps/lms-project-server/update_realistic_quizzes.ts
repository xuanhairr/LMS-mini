import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const Q_BANK: Record<string, any[]> = {
  'React': [
    {
      content: 'Trong ReactJS, Hook nào được sử dụng để quản lý state trong Functional Component?',
      options: ['useEffect', 'useState', 'useContext', 'useReducer'],
      correctAnswer: 1
    },
    {
      content: 'Đâu KHÔNG phải là một quy tắc khi sử dụng React Hooks?',
      options: ['Chỉ gọi Hooks ở trên cùng của component', 'Có thể gọi Hooks bên trong vòng lặp hoặc câu lệnh if', 'Chỉ gọi Hooks từ React Functional Components', 'Không gọi Hooks từ các hàm JavaScript thông thường'],
      correctAnswer: 1
    },
    {
      content: 'Virtual DOM trong React hoạt động như thế nào?',
      options: ['Cập nhật trực tiếp lên Real DOM mỗi khi state thay đổi', 'Tạo ra một bản sao của DOM, so sánh sự khác biệt (diffing) và chỉ cập nhật những phần thay đổi lên Real DOM', 'Thay thế toàn bộ trang web mỗi khi có sự kiện click', 'Tự động tối ưu hóa CSS của trang web'],
      correctAnswer: 1
    },
    {
      content: 'Props trong React dùng để làm gì?',
      options: ['Truyền dữ liệu từ component cha xuống component con', 'Lưu trữ trạng thái nội bộ của component', 'Kết nối trực tiếp với cơ sở dữ liệu', 'Thay thế hoàn toàn Redux'],
      correctAnswer: 0
    },
    {
      content: 'Thành phần nào là bắt buộc trong một React Component Class?',
      options: ['constructor()', 'componentDidMount()', 'render()', 'componentWillUnmount()'],
      correctAnswer: 2
    },
    {
      content: 'Làm thế nào để truyền một hàm từ component cha xuống component con trong React?',
      options: ['Dùng biến toàn cục (global variables)', 'Thông qua Props', 'Sử dụng thẻ <script>', 'Không thể truyền hàm, chỉ có thể truyền chuỗi/số'],
      correctAnswer: 1
    }
  ],
  'Node': [
    {
      content: 'Node.js được xây dựng dựa trên engine JavaScript nào?',
      options: ['SpiderMonkey', 'V8 Engine của Google Chrome', 'Chakra', 'JavaScriptCore'],
      correctAnswer: 1
    },
    {
      content: 'Kiến trúc xử lý của Node.js nổi bật nhất là gì?',
      options: ['Đa luồng (Multi-threading)', 'Đơn luồng, hướng sự kiện (Single-threaded, Event-driven)', 'Kiến trúc Microservices tích hợp', 'Kiến trúc MVC mặc định'],
      correctAnswer: 1
    },
    {
      content: 'Module nào trong Node.js được dùng để tạo Web Server cơ bản?',
      options: ['fs', 'path', 'http', 'os'],
      correctAnswer: 2
    },
    {
      content: 'NPM là viết tắt của từ gì?',
      options: ['Node Package Manager', 'Node Programming Module', 'New Project Maker', 'Network Protocol Manager'],
      correctAnswer: 0
    },
    {
      content: 'Hàm require() trong Node.js dùng để làm gì?',
      options: ['Khai báo biến', 'Import một module/thư viện', 'Xuất dữ liệu ra file', 'Tạo vòng lặp'],
      correctAnswer: 1
    },
    {
      content: 'Khái niệm Event Loop trong Node.js có vai trò gì?',
      options: ['Quản lý các kết nối cơ sở dữ liệu', 'Biên dịch mã JavaScript sang mã máy', 'Xử lý các tác vụ bất đồng bộ (Asynchronous operations)', 'Quản lý giao diện người dùng'],
      correctAnswer: 2
    }
  ],
  'Database': [
    {
      content: 'Trong SQL, lệnh nào dùng để lấy dữ liệu từ cơ sở dữ liệu?',
      options: ['EXTRACT', 'GET', 'SELECT', 'FETCH'],
      correctAnswer: 2
    },
    {
      content: 'Khóa chính (Primary Key) có đặc điểm gì?',
      options: ['Đảm bảo tính duy nhất và không được NULL', 'Có thể chứa giá trị NULL', 'Một bảng có thể có nhiều Khóa chính', 'Chỉ được dùng cho các trường dạng số'],
      correctAnswer: 0
    },
    {
      content: 'Lệnh JOIN nào trả về tất cả các hàng từ cả hai bảng nếu có sự trùng khớp?',
      options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],
      correctAnswer: 3
    },
    {
      content: 'Để lọc các bản ghi sau khi đã gom nhóm bằng GROUP BY, ta dùng mệnh đề nào?',
      options: ['WHERE', 'HAVING', 'FILTER', 'ORDER BY'],
      correctAnswer: 1
    },
    {
      content: 'NoSQL khác với CSDL quan hệ (RDBMS) ở điểm nào chính?',
      options: ['Không hỗ trợ lưu trữ dữ liệu lớn', 'Dữ liệu không lưu theo dạng bảng và quan hệ chặt chẽ', 'Luôn chậm hơn RDBMS', 'Chỉ dùng cho ứng dụng di động'],
      correctAnswer: 1
    },
    {
      content: 'Chuẩn hóa cơ sở dữ liệu (Normalization) giúp giải quyết vấn đề gì?',
      options: ['Tăng tốc độ đọc dữ liệu lên mức tối đa', 'Giảm thiểu dư thừa dữ liệu và đảm bảo tính toàn vẹn', 'Mã hóa dữ liệu bảo mật hơn', 'Tự động sao lưu dữ liệu'],
      correctAnswer: 1
    }
  ],
  'Môi trường': [
    {
      content: 'Git là gì?',
      options: ['Một ngôn ngữ lập trình', 'Một hệ thống quản lý cơ sở dữ liệu', 'Hệ thống quản lý phiên bản phân tán (VCS)', 'Một framework phát triển web'],
      correctAnswer: 2
    },
    {
      content: 'Lệnh nào dùng để clone một repository từ GitHub về máy?',
      options: ['git push', 'git commit', 'git clone', 'git pull'],
      correctAnswer: 2
    },
    {
      content: 'IDE phổ biến nhất được sử dụng cho lập trình Web hiện nay là gì?',
      options: ['Eclipse', 'Visual Studio Code (VS Code)', 'NetBeans', 'Dev-C++'],
      correctAnswer: 1
    },
    {
      content: 'File package.json có vai trò gì trong dự án Node/React?',
      options: ['Chứa mã nguồn HTML', 'Định nghĩa cấu hình dự án, scripts và các thư viện phụ thuộc (dependencies)', 'Cấu hình kết nối Database', 'Chứa mã CSS'],
      correctAnswer: 1
    },
    {
      content: 'Lệnh "npm install" có tác dụng gì?',
      options: ['Chạy ứng dụng', 'Xóa dự án', 'Tải và cài đặt các thư viện được khai báo trong package.json', 'Tải mã nguồn từ Github'],
      correctAnswer: 2
    },
    {
      content: 'Biến môi trường (Environment Variables) thường được lưu ở file nào?',
      options: ['.env', 'config.js', 'index.html', 'main.css'],
      correctAnswer: 0
    }
  ],
  'Deploy': [
    {
      content: 'CI/CD là viết tắt của thuật ngữ nào?',
      options: ['Continuous Integration / Continuous Deployment', 'Code Integration / Code Deployment', 'Cloud Infrastructure / Cloud Data', 'Compute Instance / Core Deployment'],
      correctAnswer: 0
    },
    {
      content: 'Docker Container giải quyết vấn đề gì trong lập trình?',
      options: ['Tự động viết code', '"Works on my machine" - Đảm bảo môi trường chạy đồng nhất ở mọi nơi', 'Tăng tốc độ gõ phím', 'Tự động tìm bug'],
      correctAnswer: 1
    },
    {
      content: 'Nền tảng nào sau đây thường được dùng để deploy ứng dụng frontend (React/Vue)?',
      options: ['Vercel / Netlify', 'MongoDB Atlas', 'Postman', 'MySQL Workbench'],
      correctAnswer: 0
    },
    {
      content: 'Quá trình "Build" trong ứng dụng React làm nhiệm vụ gì?',
      options: ['Chạy ứng dụng ở chế độ dev', 'Khởi tạo database', 'Biên dịch, tối ưu hóa và đóng gói mã nguồn thành các file tĩnh để deploy', 'Tạo tài khoản người dùng'],
      correctAnswer: 2
    },
    {
      content: 'Port mặc định cho kết nối HTTP là bao nhiêu?',
      options: ['443', '22', '80', '3306'],
      correctAnswer: 2
    },
    {
      content: 'Reverse Proxy (như Nginx) thường dùng để làm gì?',
      options: ['Viết mã nguồn backend', 'Quản lý state của frontend', 'Đứng trước web server để nhận, phân phối request và tăng cường bảo mật', 'Chỉnh sửa hình ảnh'],
      correctAnswer: 2
    }
  ],
  'PostgreSQL': [
    {
      content: 'PostgreSQL là hệ quản trị cơ sở dữ liệu thuộc loại nào?',
      options: ['NoSQL', 'ORDBMS (Object-Relational Database Management System)', 'In-memory database', 'Graph database'],
      correctAnswer: 1
    },
    {
      content: 'Kiểu dữ liệu nào sau đây đặc trưng và được hỗ trợ rất mạnh trong PostgreSQL?',
      options: ['VARCHAR', 'INT', 'JSONB', 'FLOAT'],
      correctAnswer: 2
    },
    {
      content: 'Lệnh nào dùng để khởi tạo một cơ sở dữ liệu mới trong PostgreSQL?',
      options: ['NEW DATABASE name;', 'CREATE DATABASE name;', 'INIT DB name;', 'MAKE DATABASE name;'],
      correctAnswer: 1
    },
    {
      content: 'pgAdmin là gì?',
      options: ['Một plugin của VS Code', 'Một ngôn ngữ truy vấn', 'Một công cụ giao diện đồ họa (GUI) quản lý PostgreSQL', 'Một framework web'],
      correctAnswer: 2
    },
    {
      content: 'Khái niệm "Schema" trong PostgreSQL có nghĩa là gì?',
      options: ['Một chuẩn định dạng file', 'Một không gian tên (namespace) chứa các bảng, view, hàm...', 'Một kiểu dữ liệu', 'Một tài khoản người dùng'],
      correctAnswer: 1
    },
    {
      content: 'Từ khóa SERIAL trong PostgreSQL thường dùng để làm gì?',
      options: ['Mã hóa mật khẩu', 'Tạo khóa ngoại', 'Tạo trường tự động tăng (Auto-increment) cho khóa chính', 'Xóa bảng'],
      correctAnswer: 2
    }
  ],
  'General': [
    {
      content: 'OOP (Lập trình hướng đối tượng) dựa trên 4 tính chất nào?',
      options: ['Tính đóng gói, Tính kế thừa, Tính đa hình, Tính trừu tượng', 'Tính lặp, Tính đệ quy, Tính phân nhánh, Tính tuần tự', 'Tính bảo mật, Tính ổn định, Tính mở rộng, Tính nhanh chóng', 'Không có đáp án đúng'],
      correctAnswer: 0
    },
    {
      content: 'API là viết tắt của từ gì?',
      options: ['Advanced Programming Interface', 'Application Programming Interface', 'Automated Process Integration', 'Application Process Indicator'],
      correctAnswer: 1
    },
    {
      content: 'JSON (JavaScript Object Notation) được sử dụng chủ yếu để làm gì?',
      options: ['Thiết kế giao diện', 'Truyền tải và lưu trữ dữ liệu có cấu trúc', 'Bảo mật mật khẩu', 'Vẽ biểu đồ'],
      correctAnswer: 1
    },
    {
      content: 'Mã HTTP Status 404 có ý nghĩa gì?',
      options: ['Lỗi Server (Internal Server Error)', 'Không có quyền truy cập (Forbidden)', 'Không tìm thấy tài nguyên (Not Found)', 'Thành công (OK)'],
      correctAnswer: 2
    },
    {
      content: 'Bảo mật JWT (JSON Web Token) thường dùng cho mục đích gì?',
      options: ['Mã hóa ổ cứng', 'Xác thực và phân quyền người dùng trong ứng dụng Web/API', 'Nén ảnh', 'Kết nối Bluetooth'],
      correctAnswer: 1
    },
    {
      content: 'Responsive Web Design là khái niệm chỉ điều gì?',
      options: ['Web có tốc độ load cực nhanh', 'Web tự động thay đổi ngôn ngữ theo IP', 'Thiết kế web có thể tự động điều chỉnh và hiển thị tốt trên nhiều kích thước màn hình khác nhau', 'Thiết kế web chỉ dành riêng cho mobile'],
      correctAnswer: 2
    }
  ]
};

async function main() {
  const quizzes = await p.quiz.findMany({
    include: { questions: true }
  });

  for (const quiz of quizzes) {
    let topic = 'General';
    const title = quiz.title || '';
    
    if (title.includes('React') || title.includes('Hooks') || title.includes('Stateless')) topic = 'React';
    else if (title.includes('Node')) topic = 'Node';
    else if (title.includes('Database') || title.includes('CSDL')) topic = 'Database';
    else if (title.includes('môi trường')) topic = 'Môi trường';
    else if (title.includes('Deploy') || title.includes('Build')) topic = 'Deploy';
    else if (title.includes('PostgreSQL')) topic = 'PostgreSQL';

    const questionsToUse = Q_BANK[topic] || Q_BANK['General'];

    // Delete existing questions
    await p.question.deleteMany({
      where: { quizId: quiz.id }
    });

    // Add new realistic questions
    const newQuestions = questionsToUse.map((q, i) => ({
      quizId: quiz.id,
      content: q.content,
      options: q.options,
      correctAnswer: q.correctAnswer,
      order: i + 1
    }));

    await p.question.createMany({
      data: newQuestions
    });
    
    console.log(`Updated realistic questions for quiz: ${title} (Topic: ${topic})`);
  }

  // Sync attempts
  const attempts = await p.quizAttempt.findMany({
    include: { quiz: { include: { questions: true } } }
  });

  for (const attempt of attempts) {
    if (!attempt.quiz || !attempt.quiz.questions) continue;

    const totalQuestions = attempt.quiz.questions.length;
    
    // Auto pass
    await p.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        totalCorrect: totalQuestions,
        score: 10.0,
        passed: true
      }
    });
  }
  console.log('Synced all quiz attempts.');
}

main().catch(console.error).finally(() => p.$disconnect());
