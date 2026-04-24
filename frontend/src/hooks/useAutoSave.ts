import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions {
  key: string;
  data: Record<string, any>;
  interval?: number;
  onSave?: (data: Record<string, any>) => void;
  enabled?: boolean;
}

export function useAutoSave({
  key,
  data,
  interval = 2000,
  onSave,
  enabled = true,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<Record<string, any>>();

  const save = useCallback(() => {
    if (!enabled) return;
    if (JSON.stringify(data) !== JSON.stringify(lastSavedRef.current)) {
      localStorage.setItem(`draft_${key}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
      lastSavedRef.current = data;
      onSave?.(data);
    }
  }, [data, key, onSave, enabled]);

  useEffect(() => {
    if (!enabled) return;
    timeoutRef.current = setTimeout(save, interval);
    return () => clearTimeout(timeoutRef.current);
  }, [save, interval, enabled]);

  const getDraft = useCallback(() => {
    const draft = localStorage.getItem(`draft_${key}`);
    return draft ? JSON.parse(draft) : null;
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`draft_${key}`);
  }, [key]);

  return { getDraft, clearDraft, save };
}
