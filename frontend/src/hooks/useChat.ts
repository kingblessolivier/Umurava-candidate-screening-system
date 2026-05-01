'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

export interface ChatDataItem {
  [key: string]: unknown;
}

export interface ChatData {
  type: 'jobs' | 'candidates' | 'screening' | 'analytics' | 'action';
  items?: ChatDataItem[];
  summary?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: ChatData;
  timestamp: Date;
  isLoading?: boolean;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(onNewReply?: (text: string) => void): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your TalentAI Agent. I can help you find candidates, check screening results, move people through your pipeline, and give you hiring insights. What would you like to do?",
      timestamp: new Date(0), // stable epoch — avoids SSR/client hydration mismatch
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      const loadingMsg: Message = {
        id: `loading-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const res = await api.post<{
          success: boolean;
          reply: string;
          data?: ChatData;
        }>('/chat', {
          message: text.trim(),
          history: historyRef.current,
        });

        const { reply, data } = res.data;

        // Update history for context
        historyRef.current = [
          ...historyRef.current,
          { role: 'user' as const, content: text.trim() },
          { role: 'assistant' as const, content: reply },
        ].slice(-20);

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply,
          data,
          timestamp: new Date(),
        };

        setMessages((prev) => prev.filter((m) => !m.isLoading).concat(assistantMsg));
        onNewReply?.(reply);
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: new Date(),
        };
        setMessages((prev) => prev.filter((m) => !m.isLoading).concat(errorMsg));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, onNewReply]
  );

  const clearMessages = useCallback(() => {
    historyRef.current = [];
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your TalentAI Agent. I can help you find candidates, check screening results, move people through your pipeline, and give you hiring insights. What would you like to do?",
        timestamp: new Date(0),
      },
    ]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
