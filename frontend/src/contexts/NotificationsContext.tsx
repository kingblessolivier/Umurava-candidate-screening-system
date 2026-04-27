'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { fetchCandidates } from '@/store/candidatesSlice';
import toast from 'react-hot-toast';

export interface AppNotification {
  id: string;
  bgJobId: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'running' | 'info';
  category: 'screening' | 'upload' | 'job' | 'candidate' | 'email' | 'system';
  timestamp: string;
  read: boolean;
  link?: string;
  jobType?: 'screening' | 'pdf_upload' | 'csv_import' | 'json_import';
  metadata?: Record<string, unknown>;
}

interface SSEEvent {
  type: string;
  jobId: string;
  jobType: 'screening' | 'pdf_upload' | 'csv_import' | 'json_import';
  status: 'done' | 'failed' | 'running' | string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export interface SSELiveEvent {
  jobId: string;
  jobType: 'screening' | 'pdf_upload' | 'csv_import' | 'json_import';
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  activeJobs: Record<string, AppNotification>;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeActiveJob: (jobId: string) => void;
  liveEvents: SSELiveEvent[];
  addLocalNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'bgJobId'>) => void;
  pushPermission: NotificationPermission | 'unsupported';
  requestPushPermission: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  activeJobs: {},
  unreadCount: 0,
  markAsRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  removeActiveJob: () => {},
  liveEvents: [],
  addLocalNotification: () => {},
  pushPermission: 'default',
  requestPushPermission: async () => {},
});

const STORAGE_KEY = 'talentai_notifications';
const MAX_STORED = 50;

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
  } catch { /* quota exceeded — ignore */ }
}

function firePushNotification(title: string, body: string, link?: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return; // only fire when tab is hidden

  const n = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'talentai',
  });

  if (link) {
    n.onclick = () => {
      window.focus();
      window.location.href = link;
      n.close();
    };
  }
}

function jobTypeToCategory(jobType: AppNotification['jobType']): AppNotification['category'] {
  if (jobType === 'screening') return 'screening';
  if (jobType === 'pdf_upload' || jobType === 'csv_import' || jobType === 'json_import') return 'upload';
  return 'system';
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeJobs, setActiveJobs] = useState<Record<string, AppNotification>>({});
  const [liveEvents, setLiveEvents] = useState<SSELiveEvent[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const esRef = useRef<EventSource | null>(null);
  const initialized = useRef(false);

  // Load persisted notifications once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = loadFromStorage();
    if (stored.length) setNotifications(stored);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    } else {
      setPushPermission('unsupported');
    }
  }, []);

  // Persist to localStorage whenever notifications change
  useEffect(() => {
    if (!initialized.current) return;
    saveToStorage(notifications);
  }, [notifications]);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
    if (result === 'granted') {
      toast.success('Push notifications enabled');
    }
  }, []);

  // SSE connection
  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('talentai_token') : null;
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const connect = () => {
      const url = `${apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as SSEEvent;
          if (data.type !== 'job_update') return;

          // ── Running: update active job + liveEvents ────────────────────
          if (data.status === 'running') {
            setActiveJobs((prev) => ({
              ...prev,
              [data.jobId]: {
                id: `${data.jobId}-active`,
                bgJobId: data.jobId,
                title: data.title,
                message: data.message,
                type: 'running',
                category: jobTypeToCategory(data.jobType),
                timestamp: data.timestamp,
                read: false,
                jobType: data.jobType,
                metadata: data.metadata,
              },
            }));

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

          if (data.status !== 'done' && data.status !== 'failed' && data.status !== 'cancelled') return;

          // ── Done / Failed: remove active job, add to list ──────────────
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
            category: jobTypeToCategory(data.jobType),
            timestamp: data.timestamp,
            read: false,
            link,
            jobType: data.jobType,
            metadata: data.metadata,
          };

          setNotifications((prev) => [notif, ...prev]);

          if (data.status === 'done') {
            toast.success(data.title, { duration: 5000 });
            firePushNotification(data.title, data.message, link);
            if (data.jobType === 'pdf_upload' || data.jobType === 'csv_import' || data.jobType === 'json_import') {
              dispatch(fetchCandidates());
            }
          } else {
            toast.error(data.title, { duration: 5000 });
            firePushNotification(`Failed: ${data.title}`, data.message);
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setTimeout(connect, 10000);
      };
    };

    connect();
    return () => { esRef.current?.close(); esRef.current = null; };
  }, []);

  // Add a manual (CRUD) notification
  const addLocalNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'bgJobId'>) => {
      const full: AppNotification = {
        ...notif,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        bgJobId: '',
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [full, ...prev]);
      firePushNotification(full.title, full.message, full.link);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveToStorage([]);
  }, []);

  const removeActiveJob = useCallback((jobId: string) => {
    setActiveJobs((prev) => {
      if (!prev[jobId]) return prev;
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, []);

  const unreadCount =
    notifications.filter((n) => !n.read).length + Object.keys(activeJobs).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        activeJobs,
        unreadCount,
        markAsRead,
        markAllRead,
        clearAll,
        removeActiveJob,
        liveEvents,
        addLocalNotification,
        pushPermission,
        requestPushPermission,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
