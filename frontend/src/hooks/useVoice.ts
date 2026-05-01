'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

interface UseVoiceReturn {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  voiceEnabled: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  toggleVoiceEnabled: () => void;
  isSupported: boolean;
}

export function useVoice(onFinalTranscript: (text: string) => void): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const recognitionRef     = useRef<AnyRecognition>(null);
  const synthRef           = useRef<SpeechSynthesis | null>(null);
  // Refs so closures always see the latest values
  const callbackRef        = useRef(onFinalTranscript);
  const latestTranscript   = useRef('');   // tracks current transcript text
  const alreadySentRef     = useRef(false); // prevents double-send

  // Keep callback ref fresh on every render
  useEffect(() => { callbackRef.current = onFinalTranscript; }, [onFinalTranscript]);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (isSupported) synthRef.current = window.speechSynthesis;
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;

    // Stop TTS before listening
    if (synthRef.current?.speaking) { synthRef.current.cancel(); setIsSpeaking(false); }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const API = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!API) return;

    const rec = new API();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;

    latestTranscript.current = '';
    alreadySentRef.current   = false;

    rec.onstart = () => {
      setIsListening(true);
      setTranscript('');
      latestTranscript.current = '';
      alreadySentRef.current   = false;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      const current = final || interim;
      latestTranscript.current = current;
      setTranscript(current);

      // Some browsers fire isFinal mid-stream — send immediately
      if (final && !alreadySentRef.current) {
        alreadySentRef.current = true;
        callbackRef.current(final.trim());
      }
    };

    rec.onerror = (e: any) => {
      // 'no-speech' is expected when user is quiet — don't treat as crash
      if (e.error !== 'no-speech') setTranscript('');
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      // Fallback: if browser never fired isFinal, send whatever we captured
      if (!alreadySentRef.current && latestTranscript.current.trim()) {
        alreadySentRef.current = true;
        callbackRef.current(latestTranscript.current.trim());
      }
      latestTranscript.current = '';
    };

    recognitionRef.current = rec;
    rec.start();
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported || !voiceEnabled || !synthRef.current) return;
    if (synthRef.current.speaking) synthRef.current.cancel();

    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .trim();

    const utterance      = new SpeechSynthesisUtterance(clean);
    utterance.rate       = 1.05;
    utterance.pitch      = 1;
    utterance.volume     = 1;
    utterance.onstart    = () => setIsSpeaking(true);
    utterance.onend      = () => setIsSpeaking(false);
    utterance.onerror    = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [isSupported, voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled(prev => {
      if (prev) synthRef.current?.cancel();
      return !prev;
    });
  }, []);

  return {
    isListening, isSpeaking, transcript, voiceEnabled,
    startListening, stopListening, speak, stopSpeaking,
    toggleVoiceEnabled, isSupported,
  };
}
