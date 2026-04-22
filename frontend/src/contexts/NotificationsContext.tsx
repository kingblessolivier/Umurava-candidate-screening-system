'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import toast from 'react-hot-toast';

export interface AppNotification {
  id: string;
  bgJobId: string;
  title: string;
  message: string;
  type: 'success' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
  jobType?: 'screening' | 'pdf_upload';
}

interface SSEEvent {
  type: string;
  jobId: string;
  jobType: 'screening' | 'pdf_upload';
  status: 'done' | 'failed' | string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  clearAll: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('talentai_token') : null;
    if (!token) return;

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const connect = () => {
      const url = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as SSEEvent;

          if (data.type !== 'job_update') return;
          if (data.status !== 'done' && data.status !== 'failed') return;

          const link =
            data.status === 'done' &&
            data.jobType === 'screening' &&
            data.result?.screeningResultId
              ? `/results/${data.result.screeningResultId as string}`
              : undefined;

          const notif: AppNotification = {
            id: `${data.jobId}-${Date.now()}`,
            bgJobId: data.jobId,
            title: data.title,
            message: data.message,
            type: data.status === 'done' ? 'success' : 'error',
            timestamp: data.timestamp,
            read: false,
            link,
            jobType: data.jobType,
          };

          setNotifications((prev) => [notif, ...prev]);

          if (data.status === 'done') {
            toast.success(data.title, { duration: 5000 });
          } else {
            toast.error(data.title, { duration: 5000 });
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Reconnect after 10 s
        setTimeout(connect, 10000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAsRead, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
