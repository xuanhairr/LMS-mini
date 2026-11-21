import React, { useState, useEffect } from 'react';
import { Card, Table, Select, Typography, Spin, message, Tag, Space } from 'antd';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchEnrollments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId && user?.id) {
      fetchAttendance(selectedClassId);
    }
  }, [selectedClassId, user]);

  const fetchEnrollments = async () => {
    try {
      const res = await apiFetch<any[]>(`/enrollments?where[studentId][equals]=${user?.id}&include[class][include][course]=true`);
      const data = res.data || [];
      setEnrollments(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].classId);
      }
    } catch (err) {
      message.error('Lỗi tải danh sách lớp học');
    }
  };

  const fetchAttendance = async (classId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch<any[]>(`/attendance/my/${user?.id}?classId=${classId}`);
      setAttendances(res.data || []);
    } catch (err) {
      message.error('Lỗi tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Buổi học',
      dataIndex: 'sessionNumber',
      key: 'sessionNumber',
      render: (num: number) => <Text strong>Buổi {num}</Text>
    },
    {
      title: 'Ngày học',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: 'Chuyên cần',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        if (status === 'present') return <span className="text-green-500 font-medium">Đi đủ</span>;
        if (status === 'late') return <span className="text-orange-500 font-medium">Đi muộn</span>;
        if (status === 'excused') return <span className="text-blue-500 font-medium">Có phép</span>;
        if (status === 'absent') return <span className="text-red-500 font-medium">Vắng mặt</span>;
        return <span className="text-gray-400">Chưa điểm danh</span>;
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note: string) => <Text type="secondary">{note || 'Không có'}</Text>
    }
  ];

  return (
    <DashboardLayout>
      <div className="bg-white p-6 rounded-xl shadow-sm min-h-[500px]">
        <div className="flex justify-between items-center mb-6">
          <Title level={3} className="m-0">Chi tiết điểm danh</Title>
          <Space>
            <Select
              value={selectedClassId}
              onChange={setSelectedClassId}
              style={{ width: 300 }}
              placeholder="Chọn lớp học..."
              options={enrollments.map(e => ({
                value: e.classId,
                label: `[${e.class?.course?.title || 'Course'}] ${e.class?.title || 'Class'}`
              }))}
            />
          </Space>
        </div>

        <Table
          loading={loading}
          columns={columns}
          dataSource={attendances}
          rowKey="id"
          pagination={false}
          bordered
        />
      </div>
    </DashboardLayout>
  );
};

export default StudentAttendancePage;
