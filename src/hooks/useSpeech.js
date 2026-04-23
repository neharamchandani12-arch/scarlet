import { useState, useRef, useCallback } from 'react';
import { getVolume } from '../utils/storage';

// ElevenLabs — Rachel voice: warm, natural, sensual
const EL_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const EL_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const onResultCallbackRef = useRef(null);
  const onEndCallbackRef = useRef(null);
  const elAudioRef = useRef(null);     // ElevenLabs HTMLAudioElement
  const keepAliveRef = useRef(null);   // Chrome 15s bug keep-alive interval

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  };

  const clearKeepAlive = () => {
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
  };

  const startListening = useCallback((onResult, onEnd) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { onEnd?.(); return; }

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
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscriptRef.current += t;
        else interimTranscript += t;
      }
      silenceTimerRef.current = setTimeout(() => {
        const full = (finalTranscriptRef.current + interimTranscript).trim();
        if (full) { recognition.stop(); onResultCallbackRef.current?.(full); }
      }, 3500);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      const remaining = finalTranscriptRef.current.trim();
      if (remaining) { onResultCallbackRef.current?.(remaining); finalTranscriptRef.current = ''; }
      onEndCallbackRef.current?.();
    };

    recognition.onerror = (e) => {
      clearSilenceTimer();
      setIsListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted') onEndCallbackRef.current?.();
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

  // Returns the best available system voice for fallback
  const getBestVoice = () => {
    const voices = synthRef.current.getVoices();
    return (
      // Edge neural voices — best on Windows
      voices.find(v => /Aria Online|Jenny Online|Michelle Online/.test(v.name)) ||
      // macOS voices
      voices.find(v => /Samantha|Karen|Moira|Tessa/.test(v.name)) ||
      // Google voices
      voices.find(v => /Google UK English Female|Google US English Female/.test(v.name)) ||
      // Windows fallback
      voices.find(v => /Victoria|Zira/.test(v.name)) ||
      voices.find(v => v.lang === 'en-US' && !/male/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith('en-')) ||
      voices[0]
    );
  };

  const speakWebSpeech = (clean, onEnd) => {
    // Split into sentences so Chrome doesn't truncate long responses
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map(s => s.trim()).filter(Boolean) || [clean];

    let idx = 0;

    // Chrome 15-second bug: pause/resume keeps the synthesis queue alive
    keepAliveRef.current = setInterval(() => {
      if (synthRef.current.speaking && !synthRef.current.paused) {
        synthRef.current.pause();
        synthRef.current.resume();
      }
    }, 10000);

    const finish = () => { clearKeepAlive(); setIsSpeaking(false); onEnd?.(); };

    const speakNext = () => {
      if (idx >= sentences.length) { finish(); return; }
      const utterance = new SpeechSynthesisUtterance(sentences[idx]);
      utterance.volume = getVolume();
      utterance.rate = 0.88;
      utterance.pitch = 1.1;

      const voices = synthRef.current.getVoices();
      if (voices.length > 0) {
        const v = getBestVoice(); if (v) utterance.voice = v;
      } else {
        synthRef.current.addEventListener('voiceschanged', () => {
          const v = getBestVoice(); if (v) utterance.voice = v;
        }, { once: true });
      }

      utterance.onstart = () => { if (idx === 0) setIsSpeaking(true); };
      utterance.onend = () => { idx++; speakNext(); };
      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') { finish(); return; }
        idx++; speakNext();
      };
      synthRef.current.speak(utterance);
    };

    speakNext();
  };

  const speak = useCallback((text, onEnd) => {
    // Stop anything currently playing
    if (elAudioRef.current) { elAudioRef.current.pause(); elAudioRef.current = null; }
    clearKeepAlive();
    synthRef.current.cancel();

    const clean = text
      .replace(/\{[\s\S]*?\}/g, '')
      .replace(/[*_`#\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!clean) { setIsSpeaking(false); onEnd?.(); return; }

    if (EL_KEY) {
      setIsSpeaking(true);
      fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}`, {
        method: 'POST',
        headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
        }),
      })
        .then(r => r.ok ? r.blob() : Promise.reject(r.status))
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = getVolume();
          elAudioRef.current = audio;
          const done = () => { URL.revokeObjectURL(url); elAudioRef.current = null; setIsSpeaking(false); onEnd?.(); };
          audio.onended = done;
          audio.onerror = () => { URL.revokeObjectURL(url); elAudioRef.current = null; setIsSpeaking(false); speakWebSpeech(clean, onEnd); };
          audio.play().catch(() => {
            // Autoplay blocked — fall back to Web Speech API
            URL.revokeObjectURL(url);
            elAudioRef.current = null;
            setIsSpeaking(false);
            speakWebSpeech(clean, onEnd);
          });
        })
        .catch(() => {
          setIsSpeaking(false);
          speakWebSpeech(clean, onEnd);
        });
      return;
    }

    // No ElevenLabs key — use browser TTS
    speakWebSpeech(clean, onEnd);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (elAudioRef.current) { elAudioRef.current.pause(); elAudioRef.current = null; }
    clearKeepAlive();
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking };
}
