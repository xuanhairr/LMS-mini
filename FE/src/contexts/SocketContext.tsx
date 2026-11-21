import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { notification as antNotification } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiFetch } from '@/lib/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface SocketContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id?: string) => void;
  fetchNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const [notifApi, notifContextHolder] = antNotification.useNotification();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('lms_token');
      const res = await apiFetch<any>('/notifications?limit=30', {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res?.data?.items) {
        setNotifications(res.data.items);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      // Cleanup on logout
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('lms_token');
    if (!token) return;

    // Fetch existing notifications
    fetchNotifications();

    // Connect WebSocket
    const socket = io(`${API_BASE}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to notifications namespace');
    });

    socket.on('new_notification', (data: AppNotification) => {
      // Thêm notification mới vào đầu danh sách
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Hiển thị Toast realtime
      notifApi[data.type || 'info']({
        message: data.title,
        description: data.message,
        placement: 'bottomRight',
        duration: 6,
        style: { cursor: 'pointer' },
        onClick: () => {
          if (data.link) navigate(data.link);
          markAsRead(data.id);
        },
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from notifications');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const markAsRead = useCallback(async (id?: string) => {
    const token = localStorage.getItem('lms_token');
    try {
      if (id) {
        await apiFetch(`/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${token}` },
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        await apiFetch('/notifications/read-all', {
          method: 'PATCH',
          headers: { authorization: `Bearer ${token}` },
        });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ notifications, unreadCount, markAsRead, fetchNotifications }}>
      {notifContextHolder}
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
