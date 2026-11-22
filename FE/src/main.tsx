import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Lọc các thông báo deprecated của thư viện Ant Design v6 giúp console luôn sạch đẹp
const origError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('[antd:') || args[0].includes('Warning: [antd'))) {
    return;
  }
  origError.apply(console, args);
};

const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('[antd:') || args[0].includes('Warning: [antd'))) {
    return;
  }
  origWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
