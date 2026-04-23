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
  type: 'success' | 'error' | 'running';
  timestamp: string;
  read: boolean;
  link?: string;
  jobType?: 'screening' | 'pdf_upload';
}

interface SSEEvent {
  type: string;
  jobId: string;
  jobType: 'screening' | 'pdf_upload';
  status: 'done' | 'failed' | 'running' | string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

// Raw running-status events — used by the screening page to show real AI thoughts
export interface SSELiveEvent {
  jobId: string;
  jobType: 'screening' | 'pdf_upload';
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  activeJobs: Record<string, AppNotification>; // in-progress jobs, keyed by bgJobId
  unreadCount: number;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  liveEvents: SSELiveEvent[];
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  activeJobs: {},
  unreadCount: 0,
  markAsRead: () => {},
  clearAll: () => {},
  liveEvents: [],
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // Active (running) jobs updated in-place — one entry per bgJobId
  const [activeJobs, setActiveJobs] = useState<Record<string, AppNotification>>({});
  const [liveEvents, setLiveEvents] = useState<SSELiveEvent[]>([]);
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

          // ── Running events: update the active-jobs panel + liveEvents ─────
          if (data.status === 'running') {
            // Update the active job entry (upsert in-place)
            setActiveJobs((prev) => ({
              ...prev,
              [data.jobId]: {
                id: `${data.jobId}-active`,
                bgJobId: data.jobId,
                title: data.title,
                message: data.message,
                type: 'running',
                timestamp: data.timestamp,
                read: false,
                jobType: data.jobType,
              },
            }));

            // Also add to liveEvents ring-buffer for the screening page
            setLiveEvents((prev) => [
              ...prev.slice(-99),
              {
                jobId: data.jobId,
                jobType: data.jobType,
                message: data.message,
                metadata: data.metadata,
                timestamp: data.timestamp,
              },
            ]);
            return;
          }

          if (data.status !== 'done' && data.status !== 'failed') return;

          // ── Done / Failed: remove from active jobs, add to completed list ─
          setActiveJobs((prev) => {
            const next = { ...prev };
            delete next[data.jobId];
            return next;
          });

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

  // Active jobs always count as "unread" while running
  const unreadCount =
    notifications.filter((n) => !n.read).length +
    Object.keys(activeJobs).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, activeJobs, unreadCount, markAsRead, clearAll, liveEvents }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
