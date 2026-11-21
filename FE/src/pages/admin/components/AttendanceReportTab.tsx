import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin, message, Typography, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';

import dayjs from 'dayjs';

const { Text } = Typography;

export const AttendanceReportTab: React.FC<{ classId: string, classData: any }> = ({ classId, classData }) => {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<any[]>([]);

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
    const dates: Date[] = [];
    const start = new Date(classData.startDate);
    const end = classData.endDate ? new Date(classData.endDate) : null;
    const daysOfWeek = classData.schedule.dayOfWeek;
    const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
    
    let current = new Date(start);
    while (dates.length < maxSessions) {
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
      render: (student: any) => <Text strong>{student?.fullName || student?.username}</Text>
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
      <div className="flex justify-end mb-4">
        <Button type="primary" ghost icon={<DownloadOutlined />} onClick={handleExportAttendance}>
          Xuất Báo cáo Điểm danh
        </Button>
      </div>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        scroll={{ x: 'max-content' }}
        size="small"
        bordered
      />
    </div>
  );
};
