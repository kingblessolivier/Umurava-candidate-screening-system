'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;
    synthRef.current = window.speechSynthesis;
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;

    // Stop any ongoing speech before listening
    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      setTranscript(final || interim);
      if (final) {
        onFinalTranscript(final.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, isListening, onFinalTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !voiceEnabled || !synthRef.current) return;
      if (synthRef.current.speaking) synthRef.current.cancel();

      // Strip markdown-like syntax for cleaner TTS
      const clean = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    },
    [isSupported, voiceEnabled]
  );

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) synthRef.current?.cancel();
      return !prev;
    });
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    voiceEnabled,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoiceEnabled,
    isSupported,
  };
}
