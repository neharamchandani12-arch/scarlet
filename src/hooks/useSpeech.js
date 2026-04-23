import { useState, useRef, useCallback } from 'react';
import { getVolume } from '../utils/storage';

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const onResultCallbackRef = useRef(null);
  const onEndCallbackRef = useRef(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startListening = useCallback((onResult, onEnd) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { onEnd?.('Speech recognition not supported'); return; }

    onResultCallbackRef.current = onResult;
    onEndCallbackRef.current = onEnd;
    finalTranscriptRef.current = '';

    synthRef.current.cancel();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      clearSilenceTimer();

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }

      // Start silence timer — wait 3.5s to let user finish multi-part sentences
      silenceTimerRef.current = setTimeout(() => {
        const full = (finalTranscriptRef.current + interimTranscript).trim();
        if (full) {
          recognition.stop();
          onResultCallbackRef.current?.(full);
        }
      }, 3500);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      // If we have accumulated text that wasn't submitted yet
      const remaining = finalTranscriptRef.current.trim();
      if (remaining) {
        onResultCallbackRef.current?.(remaining);
        finalTranscriptRef.current = '';
      }
      onEndCallbackRef.current?.();
    };

    recognition.onerror = (e) => {
      clearSilenceTimer();
      setIsListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        onEndCallbackRef.current?.();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text, onEnd) => {
    synthRef.current.cancel();
    const clean = text
      .replace(/\{[^}]+\}/g, '')
      .replace(/[*_`#\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
    if (!clean) { onEnd?.(); return; }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.volume = getVolume();
    utterance.rate = 0.92;
    utterance.pitch = 1.15;

    const setVoice = () => {
      const voices = synthRef.current.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Moira') ||
        v.name.includes('Tessa') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Victoria') ||
        (v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
    };

    const voices = synthRef.current.getVoices();
    if (voices.length > 0) {
      setVoice();
    } else {
      synthRef.current.addEventListener('voiceschanged', setVoice, { once: true });
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onEnd?.(); };

    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking };
}
