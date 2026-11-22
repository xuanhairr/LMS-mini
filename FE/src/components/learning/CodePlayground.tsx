import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Select, Space, Typography, Tag, Card, Tabs, message } from 'antd';
import { PlayCircleOutlined, ReloadOutlined, CopyOutlined, CodeOutlined, DesktopOutlined, ClearOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TEMPLATES: Record<string, { language: string; code: string; mode: 'web' | 'console' }> = {
    web: {
        language: 'html',
        mode: 'web',
        code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      padding: 2.5rem;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 400px;
    }
    button {
      background: #ff7675;
      color: white;
      border: none;
      padding: 10px 24px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>LMS-Mini Code Playground</h2>
    <p>Thực hành lập trình HTML, CSS và JavaScript trực tiếp!</p>
    <button onclick="changeText()">Nhấp thử vào đây!</button>
    <p id="output" style="margin-top: 15px; font-weight: bold;"></p>
  </div>

  <script>
    let count = 0;
    function changeText() {
      count++;
      document.getElementById('output').innerText = 'Bạn đã bấm: ' + count + ' lần 🎉';
    }
  </script>
</body>
</html>`
    },
    js: {
        language: 'javascript',
        mode: 'console',
        code: `// Thực hành JavaScript ES6 & Cấu trúc dữ liệu
console.log("🚀 Chào mừng bạn đến với LMS-Mini Code Sandbox!");

const students = [
  { name: "Hải", score: 9.5, major: "CNTT" },
  { name: "Minh", score: 8.0, major: "KTPM" },
  { name: "Linh", score: 7.5, major: "HTTT" },
  { name: "Tuấn", score: 8.8, major: "CNTT" },
];

console.log("Danh sách học viên ban đầu:", students);

// Lọc học viên đạt điểm Giỏi (>= 8.0)
const honors = students.filter(s => s.score >= 8.0);
console.log("\\n🌟 Học viên đạt điểm Giỏi:", honors);

// Tính điểm trung bình toàn lớp
const avgScore = students.reduce((sum, s) => sum + s.score, 0) / students.length;
console.log("\\n📊 Điểm trung bình lớp:", avgScore.toFixed(2));
`
    },
    algo: {
        language: 'javascript',
        mode: 'console',
        code: `// Thuật toán: Tìm kiếm nhị phân (Binary Search)
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  let steps = 0;

  while (left <= right) {
    steps++;
    const mid = Math.floor((left + right) / 2);
    console.log(\`Bước \${steps}: Xét chỉ số mid = \${mid}, giá trị = \${arr[mid]}\`);

    if (arr[mid] === target) {
      return { found: true, index: mid, steps };
    }
    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return { found: false, steps };
}

const sortedList = [2, 5, 8, 12, 16, 23, 38, 45, 56, 72, 91];
const target = 23;

console.log("Mảng kiểm tra:", sortedList);
console.log("Giá trị cần tìm:", target);

const result = binarySearch(sortedList, target);
if (result.found) {
  console.log(\`\\n✅ Tìm thấy \${target} tại vị trí index: \${result.index} sau \${result.steps} bước!\`);
} else {
  console.log(\`\\n❌ Không tìm thấy \${target} trong mảng.\`);
}
`
    }
};

const CodePlayground: React.FC<{ initialTemplate?: string }> = ({ initialTemplate = 'web' }) => {
    const [templateKey, setTemplateKey] = useState(initialTemplate);
    const [code, setCode] = useState(TEMPLATES[initialTemplate].code);
    const [language, setLanguage] = useState(TEMPLATES[initialTemplate].language);
    const [mode, setMode] = useState<'web' | 'console'>(TEMPLATES[initialTemplate].mode);
    const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [webPreviewSrc, setWebPreviewSrc] = useState(TEMPLATES[initialTemplate].code);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleTemplateChange = (val: string) => {
        setTemplateKey(val);
        const t = TEMPLATES[val];
        setCode(t.code);
        setLanguage(t.language);
        setMode(t.mode);
        if (t.mode === 'web') {
            setWebPreviewSrc(t.code);
        } else {
            setConsoleOutput([]);
        }
    };

    const handleRun = () => {
        if (mode === 'web') {
            setWebPreviewSrc(code);
            message.success('Đã làm mới xem trước giao diện!');
        } else {
            // Chạy JavaScript và ghi nhận log
            const logs: string[] = [];
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;

            try {
                console.log = (...args: any[]) => {
                    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                };
                console.warn = (...args: any[]) => {
                    logs.push('⚠️ ' + args.map(a => String(a)).join(' '));
                };
                console.error = (...args: any[]) => {
                    logs.push('❌ ' + args.map(a => String(a)).join(' '));
                };

                // Safe evaluation in function scope
                const runner = new Function(code);
                runner();

                setConsoleOutput(logs.length > 0 ? logs : ['(Chương trình đã thực thi thành công nhưng không in ra log nào)']);
                message.success('Chạy code thành công!');
            } catch (err: any) {
                logs.push(`❌ Lỗi runtime: ${err?.message || err}`);
                setConsoleOutput(logs);
                message.error('Lỗi khi thực thi mã JavaScript');
            } finally {
                console.log = originalLog;
                console.error = originalError;
                console.warn = originalWarn;
            }
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        message.success('Đã sao chép mã nguồn vào clipboard!');
    };

    const handleReset = () => {
        const t = TEMPLATES[templateKey];
        setCode(t.code);
        if (t.mode === 'web') setWebPreviewSrc(t.code);
        else setConsoleOutput([]);
        message.info('Đã khôi phục mã mẫu ban đầu');
    };

    return (
        <div className="flex flex-col h-[750px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-white gap-2">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 font-bold text-base text-cyan-400">
                        <CodeOutlined className="text-xl" /> LMS Code Playground
                    </span>
                    <Tag color="cyan" className="rounded-full px-2">Monaco Engine</Tag>
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        size="small"
                        value={templateKey}
                        onChange={handleTemplateChange}
                        className="w-48"
                        options={[
                            { value: 'web', label: '🌐 Web (HTML/CSS/JS)' },
                            { value: 'js', label: '⚡ JavaScript Arrays/Objects' },
                            { value: 'algo', label: '🧩 Binary Search Algorithm' },
                        ]}
                    />

                    <Select
                        size="small"
                        value={theme}
                        onChange={setTheme}
                        className="w-28"
                        options={[
                            { value: 'vs-dark', label: '🌙 Giao diện tối' },
                            { value: 'light', label: '☀️ Giao diện sáng' },
                        ]}
                    />

                    <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={handleRun}
                        className="bg-emerald-500 hover:bg-emerald-600 border-none font-medium"
                    >
                        Chạy Code
                    </Button>

                    <Button
                        ghost
                        icon={<ReloadOutlined />}
                        onClick={handleReset}
                        title="Khôi phục mẫu"
                    />

                    <Button
                        ghost
                        icon={<CopyOutlined />}
                        onClick={handleCopy}
                        title="Sao chép code"
                    />
                </div>
            </div>

            {/* Main Area: Split 50/50 */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Editor Pane */}
                <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 h-1/2 lg:h-full">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
                        <span>Trình soạn thảo ({language.toUpperCase()})</span>
                        <span>Nhấn Ctrl + Enter hoặc "Chạy Code" để xem kết quả</span>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={language}
                            theme={theme}
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                wordWrap: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                            }}
                        />
                    </div>
                </div>

                {/* Output / Preview Pane */}
                <div className="flex-1 flex flex-col h-1/2 lg:h-full bg-slate-900">
                    <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <DesktopOutlined /> {mode === 'web' ? 'Trình duyệt Xem trước (Live Preview)' : 'Kết quả Console'}
                        </span>
                        {mode === 'console' && (
                            <Button
                                size="small"
                                type="text"
                                icon={<ClearOutlined />}
                                onClick={() => setConsoleOutput([])}
                                className="text-slate-400 hover:text-white"
                            >
                                Xóa log
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-900">
                        {mode === 'web' ? (
                            <iframe
                                ref={iframeRef}
                                title="Web Preview"
                                srcDoc={webPreviewSrc}
                                className="w-full h-full border-none bg-white"
                                sandbox="allow-scripts allow-modals"
                            />
                        ) : (
                            <div className="p-4 font-mono text-xs text-emerald-400 bg-slate-950 h-full overflow-y-auto space-y-2">
                                {consoleOutput.length === 0 ? (
                                    <span className="text-slate-500 italic">Nhấn "Chạy Code" để thực thi mã nguồn và xem kết quả tại đây...</span>
                                ) : (
                                    consoleOutput.map((log, idx) => (
                                        <pre key={idx} className="whitespace-pre-wrap leading-relaxed m-0">{log}</pre>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodePlayground;
