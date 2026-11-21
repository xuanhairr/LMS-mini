import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Card, Typography, message, Modal, Spin, Tag, Popover } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';

const { Title, Text } = Typography;

interface ClassSchedule {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  schedule: {
    dayOfWeek: number[];
    shift: string;
  };
}

interface EventData {
  classId: string;
  title: string;
  courseTitle: string;
  sessionNo: number;
  shift: string;
  shiftTime: string;
}

const TeacherSchedule: React.FC = () => {
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Record<string, EventData[]>>({});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      // Lấy meta data của ca học để có giờ học
      const metaRes = await apiFetch<any>('/class-schedules/meta');
      const shiftsMap: Record<string, string> = {};
      if (metaRes.data && metaRes.data.shifts) {
        metaRes.data.shifts.forEach((s: any) => {
          shiftsMap[s.value] = `${s.startTime} - ${s.endTime}`;
        });
      }

      // Yêu cầu Backend chỉ trả về các lớp học ready (sẵn sàng) và active (đang diễn ra)
      const res = await apiFetch<any>('/classes?take=100&where[status][in]=ready&where[status][in]=active');
      const activeClasses = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setClasses(activeClasses);
      
      // Calculate schedule events
      const calculatedEvents: Record<string, EventData[]> = {};
      
      activeClasses.forEach((cls: any) => {
        if (!cls.startDate || !cls.schedule?.dayOfWeek) return;

        const start = new Date(cls.startDate);
        const end = cls.endDate ? new Date(cls.endDate) : null;
        const daysOfWeek = cls.schedule.dayOfWeek;

        // Convert DB dayOfWeek (2=Mon,...,8=Sun) to JS getDay() (1=Mon,...,0=Sun)
        const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));

        let current = new Date(start);
        const maxSessions = cls.sessionCount || 100;
        let sessionCount = 0;

        while (sessionCount < maxSessions) {
          if (end && current > end) break;

          const day = current.getDay();
          if (jsDays.includes(day)) {
            sessionCount++;
            const dateStr = dayjs(current).format('YYYY-MM-DD');
            if (!calculatedEvents[dateStr]) {
              calculatedEvents[dateStr] = [];
            }
            calculatedEvents[dateStr].push({
              classId: cls.id,
              title: cls.title,
              courseTitle: cls.course?.title || 'Chưa rõ môn',
              sessionNo: sessionCount,
              shift: cls.schedule.shift,
              shiftTime: shiftsMap[cls.schedule.shift] || '',
            });
          }

          current.setDate(current.getDate() + 1);
        }
      });
      
      setEvents(calculatedEvents);
    } catch (error) {
      message.error('Lỗi tải lịch giảng dạy');
    } finally {
      setLoading(false);
    }
  };

  const getListData = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    return events[dateStr] || [];
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    
    return (
      <ul className="events m-0 p-0 list-none">
        {listData.map((item, index) => (
          <li key={index} className="mb-1">
            <Popover 
              content={
                <div className="text-sm">
                  <p><strong>Môn học:</strong> {item.courseTitle}</p>
                  <p><strong>Lớp:</strong> {item.title}</p>
                  <p><strong>Tiến độ:</strong> Buổi {item.sessionNo}</p>
                  <p><strong>Ca học:</strong> {item.shift} ({item.shiftTime})</p>
                </div>
              }
              title={<span className="text-primary font-bold">Chi tiết lớp học</span>}
              trigger="hover"
            >
              <div className="w-full truncate overflow-hidden bg-blue-50 px-2 py-1 rounded border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors text-xs text-blue-800">
                <div className="font-semibold">{item.shiftTime}</div>
                <div className="truncate opacity-90">{item.courseTitle} (B{item.sessionNo})</div>
              </div>
            </Popover>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <Title level={2} className="!mb-1">Lịch giảng dạy</Title>
          <Text type="secondary">Xem lịch học của các lớp do bạn phụ trách</Text>
        </div>

        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spin size="large" />
            </div>
          ) : (
            <div className="calendar-container">
              <style>{`
                .calendar-container .ant-picker-calendar-date {
                  min-height: 120px;
                }
                .calendar-container .ant-picker-calendar-date-value {
                  font-weight: 500;
                }
                .calendar-container .events .ant-badge-status-text {
                  font-size: 11px;
                  margin-left: 4px;
                }
              `}</style>
              <Calendar 
                cellRender={(date, info) => {
                  if (info.type === 'date') return dateCellRender(date);
                  return info.originNode;
                }} 
              />
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherSchedule;
