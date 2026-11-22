import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin, message, Typography, Button } from 'antd';
import { DownloadOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';
import { StudentDetailModal } from '@/components/student/StudentDetailModal';

import dayjs from 'dayjs';

const { Text } = Typography;

export const AttendanceReportTab: React.FC<{ classId: string, classData: any, onOpenAttendance?: () => void }> = ({ classId, classData, onOpenAttendance }) => {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<any>(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await apiFetch<any[]>(`/attendance/class/${classId}`);
        setAttendances(res.data || []);
      } catch (err) {
        message.error('Lỗi tải báo cáo điểm danh');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [classId]);

  if (loading) return <Spin className="block mx-auto my-8" />;

  const students = classData.enrollments?.map((e: any) => e.student) || [];
  const maxSessions = classData.sessionCount || classData.course?.lessonCount || 30;

  // Tính toán ngày cho các buổi học
  const calculateSessionDates = () => {
    if (!classData.startDate || !classData.schedule?.dayOfWeek) return [];
    const daysOfWeek = classData.schedule.dayOfWeek;
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return [];
    const dates: Date[] = [];
    const start = new Date(classData.startDate);
    const end = classData.endDate ? new Date(classData.endDate) : null;
    const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
    
    let current = new Date(start);
    let safetyCounter = 0;
    while (dates.length < maxSessions && safetyCounter < 1000) {
      safetyCounter++;
      if (end && current > end) break;
      if (jsDays.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const sessionDates = calculateSessionDates();

  // Render columns
  const columns: any[] = [
    {
      title: 'Học viên',
      dataIndex: 'student',
      key: 'student',
      fixed: 'left',
      width: 200,
      render: (student: any) => (
        <span 
          className="cursor-pointer text-slate-800 hover:text-blue-600 font-semibold flex items-center gap-1.5 transition-colors select-none"
          onClick={() => {
            setViewingStudent(student);
            setStudentModalOpen(true);
          }}
          title="Nhấn để xem thông tin chi tiết học viên"
        >
          {student?.fullName || student?.username}
          <InfoCircleOutlined className="text-xs text-blue-400" />
        </span>
      )
    }
  ];

  for (let i = 1; i <= maxSessions; i++) {
    const sDate = sessionDates[i - 1];
    const dateStr = sDate ? dayjs(sDate).format('DD/MM') : '';
    columns.push({
      title: (
        <div className="text-center">
          B{i}
          {dateStr && <div className="text-[10px] font-normal text-muted-foreground">{dateStr}</div>}
        </div>
      ),
      dataIndex: `session_${i}`,
      key: `session_${i}`,
      width: 60,
      align: 'center',
      render: (status: string) => {
        if (!status) return '-';
        if (status === 'present') return <span title="Có mặt" className="text-green-500">✅</span>;
        if (status === 'late') return <span title="Đi muộn" className="text-orange-500">⚠️</span>;
        if (status === 'excused') return <span title="Có phép" className="text-blue-500">ℹ️</span>;
        return <span title="Vắng" className="text-red-500">❌</span>;
      }
    });
  }

  columns.push({
    title: 'Tổng vắng',
    key: 'totalAbsent',
    fixed: 'right',
    width: 100,
    align: 'center',
    render: (_: any, record: any) => {
      const absentCount = Object.keys(record)
        .filter(k => k.startsWith('session_'))
        .filter(k => record[k] === 'absent')
        .length;
      return <Tag color={absentCount > 0 ? 'red' : 'green'}>{absentCount} buổi</Tag>;
    }
  });

  // Prepare Data Source
  const dataSource = students.map((student: any) => {
    const rowData: any = { key: student.id, student };
    const studentAttendances = attendances.filter(a => a.studentId === student.id);
    studentAttendances.forEach(a => {
      rowData[`session_${a.sessionNumber}`] = a.status;
    });
    return rowData;
  });

  const handleExportAttendance = () => {
    const data = dataSource.map((row, index) => {
      const rowData: any = {
        'STT': index + 1,
        'Họ tên': row.student?.fullName || row.student?.username,
      };
      
      for (let i = 1; i <= maxSessions; i++) {
        const status = row[`session_${i}`];
        let statusText = '-';
        if (status === 'present') statusText = 'Có mặt';
        else if (status === 'late') statusText = 'Đi muộn';
        else if (status === 'excused') statusText = 'Có phép';
        else if (status === 'absent') statusText = 'Vắng';
        rowData[`Buổi ${i}`] = statusText;
      }
      
      const absentCount = Object.keys(row)
        .filter(k => k.startsWith('session_'))
        .filter(k => row[k] === 'absent')
        .length;
        
      rowData['Tổng vắng'] = absentCount;
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const cols = [{ wch: 5 }, { wch: 25 }]; // STT, Họ tên
    for (let i = 1; i <= maxSessions; i++) cols.push({ wch: 12 }); // Các buổi học
    cols.push({ wch: 15 }); // Tổng vắng
    ws['!cols'] = cols;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Diem_danh");
    XLSX.writeFile(wb, `Diem_danh_Lop_${classData.title}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Ma trận theo dõi chuyên cần toàn bộ học viên theo từng buổi học
        </div>
        <div className="flex items-center gap-2">
          {onOpenAttendance && (
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />} 
              onClick={onOpenAttendance} 
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm font-medium"
            >
              Điểm danh ngay
            </Button>
          )}
          <Button type="primary" ghost icon={<DownloadOutlined />} onClick={handleExportAttendance}>
            Xuất Báo cáo Excel
          </Button>
        </div>
      </div>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="small"
        bordered
      />
      <StudentDetailModal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        studentId={viewingStudent?.id}
        initialStudent={viewingStudent}
        classId={classId}
        className={classData?.title}
      />
    </div>
  );
};
