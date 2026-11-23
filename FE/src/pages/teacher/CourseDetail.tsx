import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Typography,
  Layout,
  Collapse,
} from "antd";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  LoadingOutlined,
  UploadOutlined,
  InfoCircleOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LinkOutlined,
  HolderOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Tabs, Radio, Spin, Upload, Avatar, List, Select, Drawer, Alert } from "antd";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { CLOUDINARY_CONFIG } from "@/lib/cloudinary";
import { useAuth } from "@/contexts/AuthContext";
import { UserOutlined, TeamOutlined } from "@ant-design/icons";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}p ${secs}s`;
};

const SortableVideoItem = ({ video, index, lessonVideos, setLessonVideos, handleReplaceUpload }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.url || `video-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "#fff",
    borderRadius: 6,
    marginBottom: 4,
    gap: "16px",
    border: '1px solid #f0f0f0',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: isDragging ? "relative" as const : "static" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1, minWidth: 0 }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', paddingTop: 8 }}>
           <HolderOutlined style={{ color: "#999", fontSize: 16 }} />
        </div>
        <PlayCircleOutlined style={{ color: "#1890ff", marginTop: 8, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 'bold', marginRight: 4, whiteSpace: 'nowrap' }}>Video {index + 1}:</span>
            <Input
              value={video.title.replace(/^video\s*\d+\s*[:\-]?\s*/i, '')}
              onChange={(e) => {
                const newVideos = [...lessonVideos];
                newVideos[index].title = e.target.value;
                setLessonVideos(newVideos);
              }}
              style={{ fontWeight: 'bold', padding: '0 4px', flex: 1 }}
              variant="borderless"
              placeholder="Nhập tiêu đề video"
            />
          </div>
          <div style={{ fontSize: 12, color: 'gray', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.url}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Thời lượng: {formatDuration(video.duration || 0)}
          </Typography.Text>
        </div>
      </div>
      <Space style={{ flexShrink: 0 }}>
        <Upload
          accept="video/*"
          showUploadList={false}
          beforeUpload={(file) => {
            handleReplaceUpload(file, index);
            return false;
          }}
        >
          <Button size="small" icon={<UploadOutlined />}>Thay file</Button>
        </Upload>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            const newVideos = [...lessonVideos];
            newVideos.splice(index, 1);
            setLessonVideos(newVideos);
          }}
        />
      </Space>
    </div>
  );
};

const { Title, Text } = Typography;
const { TextArea } = Input;

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();

  const [lessons, setLessons] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const isTeacherOnly = user?.role === 'TEACHER';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF' || user?.role === 'HEAD_STAFF' ||
    (isTeacherOnly && (course?.teacherId === user?.id || course?.teacher?.id === user?.id));

  const [isSaving, setIsSaving] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonVideos, setLessonVideos] = useState<any[]>([]);
  const [lessonAttachments, setLessonAttachments] = useState<any[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [fileLists, setFileLists] = useState<Record<string, any[]>>({});
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  const fetchAttachments = async (lessonId: string) => {
    try {
      const token = localStorage.getItem('lms_token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/upload/lesson/${lessonId}/attachments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      const attachments = Array.isArray(data.data) ? data.data : [];
      setLessonAttachments(attachments);
      setPendingDeletes([]); // Xóa danh sách chờ xóa cũ

      // Khởi tạo fileLists cho Antd
      const categories = [
        { key: 'slide' },
        { key: 'code' },
        { key: 'diagram' },
        { key: 'other' }
      ];

      setFileLists(prev => {
        const nextLists: Record<string, any[]> = {};
        categories.forEach(cat => {
          const uploading = (prev[cat.key] || []).filter(f => f.status === 'uploading');
          nextLists[cat.key] = [
            ...attachments.filter(att =>
              att.category === cat.key ||
              (!['slide', 'code', 'diagram'].includes(att.category) && cat.key === 'other')
            ).map((att) => ({
              uid: att.id,
              name: att.fileName,
              status: 'done' as const,
              url: att.fileUrl.startsWith('http') ? att.fileUrl : `${import.meta.env.VITE_API_URL || ''}${att.fileUrl}`,
            })),
            ...uploading
          ];
        });
        return nextLists;
      });
    } catch {
      message.error('Lỗi tải danh sách tài liệu');
    }
  };
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [fetchingDuration, setFetchingDuration] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  // Enrollment states
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const quizEndRef = useRef<HTMLDivElement>(null);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [tempVideoTitle, setTempVideoTitle] = useState("");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  // Auto focus and scroll to new question
  useEffect(() => {
    if (quizQuestions.length > 0) {
      setTimeout(() => {
        // Try multiple selectors to be safe
        const inputs = document.querySelectorAll('.quiz-question-input, .quiz-question-input input');
        if (inputs.length > 0) {
          const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
          lastInput.focus();
        }

        // Scroll to the end ref
        if (quizEndRef.current) {
          quizEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 300);
    }
  }, [quizQuestions.length]);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["HƯỚNG DẪN: Cột A là Câu hỏi. Các cột tiếp theo là Đáp án. Để đánh dấu đáp án ĐÚNG, hãy thêm dấu * vào ngay đầu đáp án (VD: *Hà Nội). Có thể thêm bao nhiêu cột đáp án tùy ý."],
      ["Nội dung câu hỏi", "Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
      ["1 + 1 bằng bao nhiêu?", "1", "*2", "3", "4"],
      ["Thủ đô của Việt Nam là gì?", "*Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ"]
    ]);
    
    // Gộp ô cho dòng hướng dẫn
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

    ws['!cols'] = [
      { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Quiz_Template.xlsx");
  };

  const handleFileSelect = (file: File) => {
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const rows = data.slice(2);
        const previewList: any[] = [];
        const seenQuestions = new Set<string>(quizQuestions.map((q: any) => String(q.content || '').toLowerCase().trim()));
        
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          if (!row || row.length === 0 || !row.some(cell => cell)) continue;
          
          const content = String(row[0] || '').trim();
          const options: string[] = [];
          let correctAnswerIndex = -1;
          let multipleCorrect = false;
          let errorReason = "";

          if (!content) {
            errorReason = "Thiếu nội dung câu hỏi";
          } else if (seenQuestions.has(content.toLowerCase())) {
            errorReason = "Trùng lặp câu hỏi trong file";
          } else {
            seenQuestions.add(content.toLowerCase());
          }

          for (let i = 1; i < row.length; i++) {
            const optVal = row[i];
            if (optVal !== undefined && optVal !== null && String(optVal).trim() !== '') {
              let optString = String(optVal).trim();
              if (optString.startsWith('*')) {
                if (correctAnswerIndex !== -1) multipleCorrect = true;
                correctAnswerIndex = options.length;
                optString = optString.substring(1).trim();
              }
              options.push(optString);
            }
          }
          
          if (!errorReason) {
            if (options.length < 2) {
              errorReason = "Câu hỏi phải có ít nhất 2 đáp án";
            } else if (correctAnswerIndex === -1) {
              errorReason = "Chưa đánh dấu đáp án đúng (*)";
            } else if (multipleCorrect) {
              errorReason = "Có nhiều hơn 1 đáp án đúng";
            }
          }

          previewList.push({
            key: rowIndex,
            no: rowIndex + 1,
            content,
            optionsCount: options.length,
            correctAnswer: correctAnswerIndex !== -1 ? options[correctAnswerIndex] : "",
            rawOptions: options,
            rawCorrectIndex: correctAnswerIndex,
            status: errorReason ? 'Fail' : 'Success',
            errorReason
          });
        }
        
        setImportPreviewData(previewList);
      } catch (err) {
        message.error("Có lỗi xảy ra khi đọc file Excel.");
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleConfirmImport = () => {
    const errorCount = importPreviewData.filter(item => item.status === 'Fail').length;
    if (errorCount > 0) {
      message.error("Vui lòng sửa các dòng lỗi trước khi Import!");
      return;
    }
    
    const validQuestions = importPreviewData.filter(item => item.status === 'Success').map(item => ({
      content: item.content,
      options: item.rawOptions,
      correctAnswer: item.rawCorrectIndex
    }));

    if (validQuestions.length > 0) {
      setQuizQuestions(prev => [...prev, ...validQuestions]);
      message.success(`Đã import thành công ${validQuestions.length} câu hỏi!`);
    }
    setIsImportModalOpen(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courseRes, lessonsRes] = await Promise.all([
        apiFetch<any>(`/courses/${id}`),
        apiFetch<any[]>(`/courses/${id}/lessons`),
      ]);
      setCourse(courseRes.data);
      setLessons(lessonsRes.data || []);
      fetchClasses();
    } catch (e) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiFetch<any[]>(`/classes?where[course][id][equals]=${id}`);
      const data = res.data as any;
      const items = data?.items ? data.items : (Array.isArray(data) ? data : []);
      setClasses(items);
      if (items.length > 0) {
        setSelectedClassId(items[0].id);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách lớp học", e);
    }
  };

  const fetchEnrollments = async () => {
    if (!selectedClassId) return;
    try {
      setEnrollmentLoading(true);
      const res = await apiFetch<any[]>(`/enrollments?where[class][id][equals]=${selectedClassId}`);
      const data = res.data as any;
      const items = data?.items ? data.items : (Array.isArray(data) ? data : []);
      setEnrollments(items);
    } catch (e) {
      console.error("Lỗi tải danh sách học viên", e);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [selectedClassId]);

  const handleEnrollStudent = async (studentId: string) => {
    try {
      setStudentSearchLoading(true);
      const res = await apiFetch<any>("/enrollments", {
        method: "POST",
        body: JSON.stringify({
          student: { id: studentId },
          class: { id: selectedClassId },
          course: { id: id },
        }),
      });
      message.success(res.message || "Đã thêm học viên vào lớp");
      fetchEnrollments();
      setStudentSearchLoading(false);
      setIsEnrollModalOpen(false);
    } catch (e) {
      message.error("Lỗi khi thêm học viên");
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    Modal.confirm({
      title: "Xác nhận gỡ học viên",
      content: "Bạn có chắc chắn muốn gỡ học viên này khỏi khóa học?",
      okText: "Gỡ",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await apiFetch<any>(`/enrollments/${enrollmentId}`, { method: "DELETE" });
          message.success(res.message || "Đã gỡ học viên");
          fetchEnrollments();
        } catch (e) {
          message.error("Lỗi khi gỡ học viên");
        }
      }
    });
  };

  const searchStudents = async (query: string) => {
    if (!query) {
      setAvailableStudents([]);
      return;
    }
    try {
      setStudentSearchLoading(true);
      // Backend filtering by role STUDENT might need adjustment depending on schema
      // Here assuming roles filter exists
      const res = await apiFetch<any[]>(`/users?where[roles][has]=STUDENT&where[username][contains]=${query}`);
      const data = res.data as any;
      setAvailableStudents(data?.items ? data.items : (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  const uploadQueueRef = useRef<File[]>([]);
  const isUploadingSeq = useRef<boolean>(false);

  const processVideoQueue = async () => {
    if (isUploadingSeq.current) return;
    isUploadingSeq.current = true;
    setFetchingDuration(true);

    while (uploadQueueRef.current.length > 0) {
      const file = uploadQueueRef.current.shift();
      if (!file) continue;

      const isVideo = file.type.startsWith("video/");
      const isLt100M = file.size / 1024 / 1024 < 100;

      if (!isVideo) {
        message.error(`File ${file.name} không phải video!`);
        continue;
      }
      if (!isLt100M) {
        message.error(`File ${file.name} vượt quá 100MB!`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`,
          { method: "POST", body: formData }
        );

        const data = await res.json();
        if (data.secure_url) {
          setLessonVideos(prev => {
            const newVideo = {
              url: data.secure_url,
              title: file.name.replace(/\.mp4$/i, ""),
              duration: Math.round(data.duration || 0),
            };
            return [...prev, newVideo];
          });
          message.success(`Tải lên ${file.name} thành công!`);
        } else {
          message.error(`Lỗi tải lên ${file.name} lên Cloudinary`);
        }
      } catch (e) {
        message.error(`Lỗi kết nối khi tải ${file.name}`);
      }
    }

    isUploadingSeq.current = false;
    setFetchingDuration(false);
  };

  const handleReplaceUpload = async (file: File, index: number) => {
    const isVideo = file.type.startsWith("video/");
    if (!isVideo) {
      message.error("Chỉ được phép tải lên file video!");
      return;
    }
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error("Dung lượng video vượt quá giới hạn cho phép (tối đa 100MB)!");
      return;
    }

    try {
      setFetchingDuration(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();
      if (data.secure_url) {
        const newVideos = [...lessonVideos];
        newVideos[index] = {
          ...newVideos[index],
          url: data.secure_url,
          duration: Math.round(data.duration || 0),
        };
        setLessonVideos(newVideos);
        message.success("Thay thế file thành công!");
      }
    } catch (e) {
      message.error("Lỗi thay thế file");
    } finally {
      setFetchingDuration(false);
    }
  };

  const handleEditTitle = (index: number) => {
    setEditingVideoIndex(index);
    setTempVideoTitle(lessonVideos[index].title);
    setIsTitleModalOpen(true);
  };

  const handleSaveTitle = () => {
    if (editingVideoIndex !== null) {
      const newVideos = [...lessonVideos];
      newVideos[editingVideoIndex].title = tempVideoTitle;
      setLessonVideos(newVideos);
      setIsTitleModalOpen(false);
      setEditingVideoIndex(null);
    }
  };

  const handleUploadCover = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();
      if (data.secure_url) {
        const res = await apiFetch<any>(`/courses/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ coverImage: data.secure_url }),
        });
        message.success(res.message || "Cập nhật ảnh bìa thành công!");
        fetchData();
      }
    } catch (e) {
      message.error("Lỗi cập nhật ảnh bìa");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();

      const { homeworks, ...restValues } = values;

      const payload: any = {
        ...restValues,
        duration: lessonVideos.reduce((acc, v) => acc + (v.duration || 0), 0),
        course: { id },
        typeField: lessonVideos.length > 0 ? "Video" : (quizQuestions.length > 0 ? "Quiz" : "Document"),
        videos: {
          create: lessonVideos.map((v) => ({
            url: v.url,
            title: v.title || v.url,
            duration: v.duration,
          })),
        },
        quizzes: quizQuestions.length > 0 ? {
          create: [{
            title: values.title + " Quiz",
            questions: {
              create: quizQuestions.map(q => {
                const filteredOptions = q.options.filter((opt: string) => opt.trim() !== "");
                if (filteredOptions.length < 2) {
                  throw new Error(`Câu hỏi "${q.content || 'không tên'}" phải có ít nhất 2 đáp án không trống.`);
                }

                const originalCorrectText = q.options[q.correctAnswer];
                let newCorrectIdx = filteredOptions.indexOf(originalCorrectText);
                if (newCorrectIdx === -1) newCorrectIdx = 0;

                return {
                  content: q.content,
                  options: filteredOptions,
                  correctAnswer: newCorrectIdx
                };
              })
            }
          }]
        } : undefined
      };

      if (editingLesson) {
        payload.videos.deleteMany = {};
        if (payload.quizzes) {
          payload.quizzes.deleteMany = {};
        } else {
          payload.quizzes = { deleteMany: {} };
        }
      }

      const url = editingLesson ? `/lessons/${editingLesson.id}` : `/lessons`;
      const res = await apiFetch<any>(url, {
        method: editingLesson ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      const lessonId = editingLesson ? editingLesson.id : res.data?.id;

      // Sync homeworks
      if (lessonId && values.homeworks) {
        await apiFetch(`/lessons/${lessonId}/homeworks`, {
          method: 'POST',
          body: JSON.stringify(values.homeworks)
        });
      }

      // Save pending attachments
      if (lessonId && pendingAttachments.length > 0) {
        const token = localStorage.getItem('lms_token');
        for (const item of pendingAttachments) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/lesson/${lessonId}/attachment`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileUrl: item.fileUrl,
                fileName: item.fileName,
                fileSize: item.fileSize,
                mimetype: item.mimetype,
                publicId: item.publicId,
                category: item.category,
                title: item.fileName,
              }),
            });
          } catch (e) {
            console.error('Error saving pending attachment:', e);
          }
        }
        setPendingAttachments([]);
      }

      // Execute pending deletes
      if (pendingDeletes.length > 0) {
        const token = localStorage.getItem('lms_token');
        for (const id of pendingDeletes) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/attachment/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (e) {
            console.error('Error executing pending delete:', e);
          }
        }
        setPendingDeletes([]);
      }

      message.success(res.message || (editingLesson ? "Cập nhật bài học thành công!" : "Thêm bài học mới thành công!"));
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      message.error(e.message || "Lỗi khi lưu bài học");
    } finally {
      setIsSaving(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = lessonVideos.findIndex((v, i) => (v.url || `video-${i}`) === active.id);
      const newIndex = lessonVideos.findIndex((v, i) => (v.url || `video-${i}`) === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setLessonVideos((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {course?.title || "Đang tải..."}
              </Title>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text type="secondary">Quản lý nội dung bài học</Text>
                {canEdit && (
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleUploadCover(file);
                      return false;
                    }}
                  >
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      style={{ padding: 0 }}
                    >
                      Đổi ảnh bìa
                    </Button>
                  </Upload>
                )}
              </div>
            </div>
          </Space>
        </div>

        <Tabs
          defaultActiveKey="content"
          items={[
            {
              key: "overview",
              label: (
                <span>
                  <InfoCircleOutlined /> Tổng quan
                </span>
              ),
              children: (
                <Card>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Tên khóa học:</Text>
                      <br />
                      <Text>{course?.title}</Text>
                    </div>
                    <div>
                      <Text strong>Mô tả:</Text>
                      <br />
                      <Text>{course?.description || 'Chưa có mô tả'}</Text>
                    </div>
                    {course?.coverImage && (
                      <div>
                        <Text strong>Ảnh bìa:</Text>
                        <br />
                        <img src={course.coverImage} alt="Cover" style={{ maxWidth: 300, borderRadius: 8, marginTop: 8 }} />
                      </div>
                    )}
                  </Space>
                </Card>
              )
            },
            {
              key: "content",
              label: (
                <span>
                  <FileTextOutlined /> Đề cương & Bài học
                </span>
              ),
              children: (
                <Card
                  styles={{ body: { padding: 0 } }}
                  title={<span className="text-base font-semibold">Cấu trúc khóa học</span>}
                  extra={
                    canEdit && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingLesson(null);
                          setLessonVideos([]);
                          setLessonAttachments([]);
                          setPendingAttachments([]);
                          setPendingDeletes([]);
                          setQuizQuestions([]);
                          form.resetFields();
                          form.setFieldsValue({ status: "published" });
                          setIsModalOpen(true);
                        }}
                      >
                        Thêm bài học mới
                      </Button>
                    )
                  }
                >
                  <Table
                    loading={loading}
                    dataSource={lessons}
                    pagination={false}
                    rowKey="id"
                    columns={[
                      {
                        title: "Nội dung bài học",
                        render: (_, record, index) => (
                          <Space align="start">
                            <VideoCameraOutlined
                              style={{ fontSize: 20, color: "#1890ff" }}
                            />
                            <div>
                              <Space>
                                <Text
                                  strong
                                >{`Bài ${index + 1}: ${record.title}`}</Text>
                                <Tag color={record.status === "published" ? "blue" : "default"}>
                                  {record.status === "published" ? "Công khai" : "Nháp"}
                                </Tag>
                                {record.quizzes?.length > 0 && (
                                  <Tag color="green" icon={<QuestionCircleOutlined />}>
                                    {record.quizzes.length} Quiz
                                  </Tag>
                                )}
                              </Space>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.videos?.length || 0} videos •{" "}
                                {formatDuration(record.duration || 0)}
                              </Text>
                            </div>
                          </Space>
                        ),
                      },
                      {
                        title: "Hành động",
                        width: 120,
                        render: (record) => (
                          canEdit ? (
                            <Space>
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditingLesson(record);
                                  setLessonVideos(record.videos || []);
                                  fetchAttachments(record.id);
                                  setQuizQuestions(record.quizzes?.[0]?.questions || []);
                                  form.setFieldsValue(record);
                                  setIsModalOpen(true);
                                }}
                              />
                              <Button type="text" danger icon={<DeleteOutlined />} />
                            </Space>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Không có quyền</span>
                          )
                        ),
                      },
                    ]}
                    expandable={{
                      expandedRowRender: (record) => {
                        const items = [];

                        if (record.videos?.length > 0) {
                          items.push({
                            key: 'videos',
                            label: <Text strong><VideoCameraOutlined /> Danh sách video ({record.videos.length})</Text>,
                            children: (
                              <Table
                                dataSource={record.videos}
                                pagination={false}
                                size="small"
                                rowKey="id"
                                columns={[
                                  { title: "Tiêu đề", dataIndex: "title", key: "title" },
                                  {
                                    title: "Link",
                                    dataIndex: "url",
                                    key: "url",
                                    render: (url) => <a href={url} target="_blank" rel="noreferrer">{url}</a>
                                  },
                                  {
                                    title: "Thời lượng",
                                    dataIndex: "duration",
                                    key: "duration",
                                    render: (d) => formatDuration(d || 0)
                                  },
                                ]}
                              />
                            )
                          });
                        }

                        if (record.attachments?.length > 0) {
                          items.push({
                            key: 'attachments',
                            label: <Text strong><PaperClipOutlined /> Tài liệu đính kèm ({record.attachments.length})</Text>,
                            children: (
                              <Table
                                dataSource={record.attachments}
                                pagination={false}
                                size="small"
                                rowKey="id"
                                columns={[
                                  { title: "Tên tài liệu", dataIndex: "fileName", key: "fileName", render: (text, att: any) => text || att.title || 'Không tên' },
                                  { title: "Loại", dataIndex: "category", key: "category", render: (cat) => <Tag color="blue">{cat === 'slide' ? 'Slide' : cat === 'code' ? 'Code' : cat === 'diagram' ? 'Sơ đồ' : 'Khác'}</Tag> },
                                  {
                                    title: "Link",
                                    dataIndex: "fileUrl",
                                    key: "fileUrl",
                                    render: (url) => <a href={url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`} target="_blank" rel="noreferrer">Tải xuống / Xem</a>
                                  }
                                ]}
                              />
                            )
                          });
                        }



                        return (
                          <div style={{ padding: "4px 16px 4px 36px" }}>
                            {record.quizzes?.length > 0 && (
                              <div style={{ marginBottom: items.length > 0 ? 8 : 0 }}>
                                {record.quizzes.map((q: any, i: number) => (
                                  <div key={`q-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', marginLeft: 24 }}>
                                    <FileTextOutlined style={{ color: '#52c41a' }} />
                                    <Text strong>Bài tập (Quiz):</Text>
                                    <Text type="secondary">{q.questions?.length || 0} câu hỏi</Text>
                                  </div>
                                ))}
                              </div>
                            )}

                            {items.length > 0 && (
                              <Collapse items={items} ghost size="small" />
                            )}
                            
                            {items.length === 0 && (!record.quizzes || record.quizzes.length === 0) && (
                              <Text type="secondary" italic>Không có nội dung chi tiết</Text>
                            )}
                          </div>
                        );
                      },
                      rowExpandable: (record) => (record.videos?.length > 0 || record.quizzes?.length > 0 || record.attachments?.length > 0),
                    }}
                  />
                </Card>
              )
            },
          ]}
        />
      </Space>

      {/* Enroll Student Modal */}
      <Modal
        title="Thêm học viên vào lớp học"
        open={isEnrollModalOpen}
        onCancel={() => setIsEnrollModalOpen(false)}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Tìm kiếm sinh viên theo username/email..."
            enterButton
            loading={studentSearchLoading}
            onSearch={searchStudents}
          />
        </div>
        <List
          dataSource={availableStudents}
          renderItem={(student) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  onClick={() => handleEnrollStudent(student.id)}
                  disabled={enrollments.some(e => e.student?.id === student.id)}
                >
                  {enrollments.some(e => e.student?.id === student.id) ? "Đã trong lớp" : "Thêm"}
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={student.fullName || student.username}
                description={(student.fullName || student.username) !== student.email ? student.email : undefined}
              />
            </List.Item>
          )}
        />
      </Modal>

      <Drawer
        title={editingLesson ? "Sửa bài học" : "Thêm bài học"}
        open={isModalOpen}
        onClose={async () => {
          // Xóa các file đang chờ tải lên trên Cloudinary vì người dùng đã hủy
          if (pendingAttachments.length > 0) {
            const token = localStorage.getItem('lms_token');
            for (const item of pendingAttachments) {
              try {
                await fetch(`${import.meta.env.VITE_API_URL || ''}/api/upload/cloudinary?publicId=${item.publicId}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                });
              } catch (e) {
                console.error('Error deleting pending attachment on close:', e);
              }
            }
            setPendingAttachments([]);
          }
          // Reset các state tạm thời
          setPendingDeletes([]);
          setFileLists({});
          setIsModalOpen(false);
        }}
        width={900}
        styles={{ body: { padding: '0px 24px 24px 24px' } }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button onClick={handleSave} type="primary" loading={isSaving}>
              Lưu bài học
            </Button>
          </div>
        }
      >
        {course?.status === 'published' && (
          <Alert 
            message="Khóa học đang được công khai!" 
            description="Lưu ý: Mọi thay đổi của bạn (đổi video, sửa bài tập) sẽ được áp dụng ngay lập tức và có thể ảnh hưởng đến các học viên đang theo học. Vui lòng kiểm tra kỹ trước khi lưu."
            type="warning" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} layout="vertical">
          <Tabs
            defaultActiveKey="info"
            size="small"
            items={[
              {
                key: "info",
                label: (
                  <span>
                    <InfoCircleOutlined /> Thông tin
                  </span>
                ),
                children: (
                  <div>
                    <Form.Item
                      name="title"
                      label="Tên bài học"
                      rules={[{ required: true }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input placeholder="Ví dụ: Cài đặt môi trường" />
                    </Form.Item>

                    <Form.Item name="status" label="Trạng thái" style={{ marginBottom: 12 }}>
                      <Radio.Group>
                        <Radio value="draft">Bản nháp</Radio>
                        <Radio value="published">Công khai</Radio>
                      </Radio.Group>
                    </Form.Item>

                    <Form.Item name="content" label="Mô tả bài học" style={{ marginBottom: 0 }}>
                      <TextArea rows={4} placeholder="Nhập mô tả chi tiết cho bài học này..." />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "video",
                label: (
                  <span>
                    <VideoCameraOutlined /> Video
                  </span>
                ),
                children: (
                  <div
                    style={{
                      background: "#f5f5f5",
                      padding: "8px 12px",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text strong>Danh sách Video</Text>
                    <Space
                      direction="vertical"
                      style={{ width: "100%", marginTop: 10, marginBottom: 10 }}
                    >
                      <Upload
                        accept="video/*"
                        multiple={true}
                        showUploadList={false}
                        beforeUpload={(file) => {
                          uploadQueueRef.current.push(file);
                          setTimeout(() => {
                            if (!isUploadingSeq.current) processVideoQueue();
                          }, 100);
                          return false;
                        }}
                      >
                        <Button
                          icon={<UploadOutlined />}
                          loading={fetchingDuration}
                          type="primary"
                          block
                        >
                          Tải lên Video cho bài học
                        </Button>
                      </Upload>
                    </Space>

                    {fetchingDuration && (
                      <div style={{ textAlign: "center", padding: 10 }}>
                        <Spin tip="Đang tải lên..." />
                      </div>
                    )}

                    <div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={lessonVideos.map((v, i) => v.url || `video-${i}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {lessonVideos.map((v, idx) => (
                            <SortableVideoItem
                              key={v.url || `video-${idx}`}
                              video={v}
                              index={idx}
                              lessonVideos={lessonVideos}
                              setLessonVideos={setLessonVideos}
                              handleReplaceUpload={handleReplaceUpload}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                ),
              },
              {
                key: "quiz",
                label: (
                  <span>
                    <FileTextOutlined /> Bài tập (Quiz)
                  </span>
                ),
                children: (
                  <div
                    style={{
                      background: "#f5f5f5",
                      padding: "8px 12px",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Text strong>Câu hỏi Quiz</Text>
                      <Space>
                        <Button icon={<UploadOutlined />} onClick={() => {
                          setIsImportModalOpen(true);
                          setImportPreviewData([]);
                          setImportFileName(null);
                        }}>
                          Import Excel
                        </Button>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() =>
                            setQuizQuestions([
                              ...quizQuestions,
                              {
                                content: "",
                                options: ["", "", "", ""],
                                correctAnswer: 0,
                              },
                            ])
                          }
                        >
                          Thêm câu hỏi
                        </Button>
                      </Space>
                    </div>

                    <div>
                      {quizQuestions.map((q, qIdx) => (
                        <Card
                          key={qIdx}
                          size="small"
                          style={{ marginBottom: 8 }}
                          title={`Câu hỏi ${qIdx + 1}`}
                          extra={
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setQuizQuestions(
                                  quizQuestions.filter((_, i) => i !== qIdx),
                                )
                              }
                            />
                          }
                        >
                          <Input
                            placeholder="Nội dung câu hỏi"
                            value={q.content}
                            onChange={(e) => {
                              const newQuestions = [...quizQuestions];
                              newQuestions[qIdx].content = e.target.value;
                              setQuizQuestions(newQuestions);
                            }}
                            className="quiz-question-input"
                            style={{ marginBottom: 10 }}
                          />
                          <Radio.Group
                            value={q.correctAnswer}
                            onChange={(e) => {
                              const newQuestions = [...quizQuestions];
                              newQuestions[qIdx].correctAnswer = e.target.value;
                              setQuizQuestions(newQuestions);
                            }}
                            style={{ width: "100%" }}
                          >
                            <Space
                              direction="vertical"
                              style={{ width: "100%" }}
                            >
                              {q.options.map((opt: string, oIdx: number) => (
                                <div
                                  key={oIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <Radio value={oIdx} />
                                  <Input
                                    placeholder={`Đáp án ${oIdx + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const newQuestions = [...quizQuestions];
                                      newQuestions[qIdx].options[oIdx] = e.target.value;
                                      setQuizQuestions(newQuestions);
                                    }}
                                  />
                                  {q.options.length > 2 && (
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => {
                                        const newQuestions = [...quizQuestions];
                                        const newOptions = [...newQuestions[qIdx].options];
                                        newOptions.splice(oIdx, 1);
                                        newQuestions[qIdx].options = newOptions;

                                        // Update correctAnswer index if needed
                                        if (newQuestions[qIdx].correctAnswer === oIdx) {
                                          newQuestions[qIdx].correctAnswer = 0;
                                        } else if (newQuestions[qIdx].correctAnswer > oIdx) {
                                          newQuestions[qIdx].correctAnswer -= 1;
                                        }

                                        setQuizQuestions(newQuestions);
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                              <Button
                                type="dashed"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  const newQuestions = [...quizQuestions];
                                  newQuestions[qIdx].options.push("");
                                  setQuizQuestions(newQuestions);
                                }}
                                style={{ marginTop: 5 }}
                              >
                                Thêm đáp án
                              </Button>
                            </Space>
                          </Radio.Group>
                        </Card>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: "attachment",
                label: (
                  <span>
                    <PaperClipOutlined /> Tài liệu
                  </span>
                ),
                children: (
                  <div
                    style={{
                      background: "#f5f5f5",
                      padding: "16px",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { key: 'slide', label: 'Slide bài giảng' },
                        { key: 'code', label: 'Code mẫu' },
                        { key: 'diagram', label: 'Sơ đồ' },
                        { key: 'other', label: 'Khác' }
                      ].map((category) => (
                        <div key={category.key} className="bg-white p-4 rounded-lg border border-slate-200">
                          <div className="mb-2">
                            <Text strong>{category.label}</Text>
                          </div>

                          <Upload
                            accept={category.key === 'slide' ? 'application/pdf' : undefined}
                            beforeUpload={(file) => {
                              if (category.key === 'slide' && file.type !== 'application/pdf') {
                                message.error('Phần Slide chỉ cho phép tải lên file PDF!');
                                return Upload.LIST_IGNORE;
                              }
                              return true;
                            }}
                            fileList={fileLists[category.key] || []}
                            action={`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`}
                            data={{
                              upload_preset: CLOUDINARY_CONFIG.uploadPreset,
                            }}
                            onChange={async (info) => {
                              // Cập nhật fileLists để Antd hiện loading/done/error!
                              setFileLists({
                                ...fileLists,
                                [category.key]: info.fileList
                              });

                              console.log('Upload status:', info.file.status);
                              console.log('Upload response:', info.file.response);

                              if (info.file.status === 'done') {
                                const response = info.file.response;
                                const fileUrl = response.secure_url;
                                const publicId = response.public_id;
                                const fileName = info.file.name;
                                const fileSize = info.file.size;
                                const mimetype = info.file.type || 'application/octet-stream';

                                console.log('Adding to pending attachments:', { fileName, category: category.key });
                                setPendingAttachments((prev) => [...prev, {
                                  uid: info.file.uid,
                                  fileUrl,
                                  fileName,
                                  fileSize,
                                  mimetype,
                                  publicId,
                                  category: category.key
                                }]);
                                message.success(`Tải lên ${category.label.toLowerCase()} thành công!`);
                              } else if (info.file.status === 'error') {
                                message.error(`Tải lên ${category.label.toLowerCase()} thất bại.`);
                              }
                            }}
                            onRemove={(file) => {
                              if (editingLesson) {
                                // Nếu là file đã có trong DB (uid là id của attachment)
                                if (!file.uid.startsWith('rc-upload-')) {
                                  setPendingDeletes((prev) => [...prev, file.uid]);
                                }
                              } else {
                                setPendingAttachments(pendingAttachments.filter(p => p.uid !== file.uid));
                              }

                              // Cập nhật fileLists để Antd xóa khỏi giao diện
                              setFileLists((prev) => ({
                                ...prev,
                                [category.key]: (prev[category.key] || []).filter(f => f.uid !== file.uid)
                              }));
                            }}
                          >
                            <Button type="primary" size="small" icon={<UploadOutlined />}>
                              Chọn file
                            </Button>
                          </Upload>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: "homework",
                label: (
                  <span>
                    <FileTextOutlined /> Bài tập về nhà
                  </span>
                ),
                children: (
                  <div style={{ background: "#f5f5f5", padding: "16px", borderRadius: 8 }}>
                    <Form.List name="homeworks">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }, index) => (
                            <Card 
                              key={key} 
                              size="small" 
                              title={`Bài tập ${index + 1}`} 
                              extra={<Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />}
                              style={{ marginBottom: 16 }}
                            >
                              <Form.Item
                                {...restField}
                                name={[name, 'title']}
                                label="Tiêu đề bài tập"
                                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề bài tập' }]}
                              >
                                <Input placeholder="Ví dụ: [Khá] Thực hành CRUD với MongoDB" />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, 'level']}
                                label="Mức độ"
                              >
                                <Select placeholder="Chọn mức độ" options={[
                                  { label: 'Cơ bản', value: 'Cơ bản' },
                                  { label: 'Khá', value: 'Khá' },
                                  { label: 'Giỏi', value: 'Giỏi' },
                                  { label: 'Xuất sắc', value: 'Xuất sắc' },
                                ]} />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, 'description']}
                                label="Mô tả / Yêu cầu tự luận"
                              >
                                <ReactQuill 
                                  theme="snow"
                                  placeholder="Mô tả chi tiết yêu cầu bài tập, đề bài..." 
                                  style={{ height: '200px', marginBottom: '50px' }}
                                />
                              </Form.Item>
                            </Card>
                          ))}
                          <Form.Item>
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              Thêm bài tập
                            </Button>
                          </Form.Item>
                        </>
                      )}
                    </Form.List>
                  </div>
                ),
              },
            ]}
          />

        </Form>
      </Drawer>

      <Modal
        title="Sửa tiêu đề"
        open={isTitleModalOpen}
        onOk={handleSaveTitle}
        onCancel={() => setIsTitleModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ marginTop: 10 }}>
          <Text strong>Tiêu đề:</Text>
          <Input
            value={tempVideoTitle}
            onChange={(e) => setTempVideoTitle(e.target.value)}
            style={{ marginTop: 8 }}
            onPressEnter={handleSaveTitle}
            autoFocus
          />
        </div>
      </Modal>

      <Drawer
        title="Import câu hỏi từ Excel"
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        width={1000}
        extra={
          <Space>
            <Button onClick={() => setIsImportModalOpen(false)}>Close</Button>
            <Button 
              type="primary" 
              onClick={handleConfirmImport}
              disabled={importPreviewData.filter(i => i.status === 'Fail').length > 0 || importPreviewData.length === 0}
            >
              Import
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ marginBottom: 16 }}>
            Download file template
          </Button>
          <Upload.Dragger
            accept=".xlsx, .xls"
            showUploadList={false}
            beforeUpload={(file) => handleFileSelect(file as any)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag files here to upload.</p>
            <p className="ant-upload-hint">
              Support single or batch upload. Prohibited from uploading company data or unrelated data files.
            </p>
          </Upload.Dragger>
        </div>

        {importFileName && (
          <div style={{ marginBottom: 16 }}>
            <PaperClipOutlined /> <Typography.Text strong>{importFileName}</Typography.Text>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#e6f4ff', padding: '10px 16px', borderRadius: 6, border: '1px solid #91caff', marginBottom: 16 }}>
          <Typography.Text style={{ color: '#0958d9' }}><InfoCircleOutlined /> Total records: <Typography.Text strong style={{ color: '#0958d9' }}>{importPreviewData.length}</Typography.Text></Typography.Text>
          <Typography.Text style={{ color: '#0958d9' }}>Error records: <Typography.Text strong style={{ color: '#0958d9' }}>{importPreviewData.filter(i => i.status === 'Fail').length}</Typography.Text></Typography.Text>
          <Typography.Text style={{ color: '#0958d9' }}>Successful records: <Typography.Text strong style={{ color: '#0958d9' }}>{importPreviewData.filter(i => i.status === 'Success').length}</Typography.Text></Typography.Text>
        </div>

        <Table
          dataSource={importPreviewData}
          pagination={{ pageSize: 5 }}
          size="small"
          rowKey="key"
          columns={[
            { title: 'No', dataIndex: 'no', width: 60 },
            { title: 'Câu hỏi', dataIndex: 'content', ellipsis: true },
            { title: 'Số đáp án', dataIndex: 'optionsCount', width: 100 },
            { title: 'Đáp án đúng', dataIndex: 'correctAnswer', ellipsis: true },
            { 
              title: 'Import status', 
              dataIndex: 'status', 
              width: 120,
              render: (status) => (
                <Tag color={status === 'Success' ? 'success' : 'error'}>
                  {status}
                </Tag>
              )
            },
            { title: 'Error reason', dataIndex: 'errorReason', width: 250, render: (err) => <Typography.Text type="danger">{err}</Typography.Text> }
          ]}
        />
      </Drawer>

    </DashboardLayout>
  );
};

export default CourseDetail;
