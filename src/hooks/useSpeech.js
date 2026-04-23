import { useState, useRef, useCallback } from 'react';
import { getVolume } from '../utils/storage';

const EL_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const EL_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const synthRef       = useRef(window.speechSynthesis);
  const elAudioRef     = useRef(null);
  const keepAliveRef   = useRef(null);

  // Whisper recording refs
  const mediaRecRef    = useRef(null);
  const streamRef      = useRef(null);
  const audioCtxRef    = useRef(null);
  const silenceRef     = useRef(null);
  const checkRef       = useRef(null);
  const stopRecRef     = useRef(null); // callable to stop current recording
  const onResultRef    = useRef(null);
  const onEndRef       = useRef(null);

  const clearKeepAlive = () => {
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
  };

  // ── LISTENING (Groq Whisper) ─────────────────────────────────────────────

  const startListening = useCallback((onResult, onEnd) => {
    onResultRef.current = onResult;
    onEndRef.current    = onEnd;

    // Stop any current speech
    synthRef.current.cancel();
    if (elAudioRef.current) { elAudioRef.current.pause(); elAudioRef.current = null; }

    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackWebSpeech(onResult, onEnd);
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;

        // Pick a supported MIME type Groq Whisper accepts
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
          .find(t => MediaRecorder.isTypeSupported(t)) || '';

        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
        mediaRecRef.current = recorder;
        const chunks = [];

        // Silence detection via Web Audio API
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let hasSpoken = false;

        const doStop = () => {
          if (checkRef.current)  { clearInterval(checkRef.current); checkRef.current = null; }
          if (silenceRef.current){ clearTimeout(silenceRef.current); silenceRef.current = null; }
          if (recorder.state !== 'inactive') { try { recorder.stop(); } catch {} }
        };
        stopRecRef.current = doStop;

        checkRef.current = setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((s, v) => s + v, 0) / data.length;
          if (avg > 10) {
            hasSpoken = true;
            if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
          } else if (hasSpoken && !silenceRef.current) {
            // 1.8s of silence after speaking → done
            silenceRef.current = setTimeout(doStop, 1800);
          }
        }, 80);

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = async () => {
          if (checkRef.current)  { clearInterval(checkRef.current);  checkRef.current = null; }
          if (silenceRef.current){ clearTimeout(silenceRef.current); silenceRef.current = null; }
          stream.getTracks().forEach(t => t.stop());
          try { ctx.close(); } catch {}
          streamRef.current = audioCtxRef.current = null;
          setIsListening(false);

          if (!hasSpoken || !chunks.length) { onEndRef.current?.(); return; }

          try {
            const blob = new Blob(chunks, { type: mime || 'audio/webm' });
            const form = new FormData();
            form.append('file', blob, 'audio.webm');
            form.append('model', 'whisper-large-v3');
            form.append('language', 'en');
            form.append('response_format', 'json');

            const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${GROQ_KEY}` },
              body: form,
            });

            const json = await res.json();
            const transcript = json.text?.trim();
            if (transcript) onResultRef.current?.(transcript);
            else onEndRef.current?.();
          } catch (e) {
            console.error('Whisper error:', e);
            onEndRef.current?.();
          }
        };

        recorder.start(200);
        setIsListening(true);
      })
      .catch(() => fallbackWebSpeech(onResult, onEnd));
  }, []);

  // Fallback: browser Web Speech API (less accurate, but better than nothing)
  function fallbackWebSpeech(onResult, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onEnd?.(); return; }
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = false;
    r.onresult = e => {
      const t = Array.from(e.results).map(x => x[0].transcript).join(' ').trim();
      if (t) onResult(t);
    };
    r.onend = () => { setIsListening(false); onEnd?.(); };
    r.onerror = () => { setIsListening(false); onEnd?.(); };
    r.start();
    setIsListening(true);
  }

  const stopListening = useCallback(() => {
    stopRecRef.current?.();
    setIsListening(false);
  }, []);

  // ── SPEAKING (ElevenLabs → Web Speech fallback) ──────────────────────────

  const getBestVoice = () => {
    const v = synthRef.current.getVoices();
    return (
      v.find(x => /Aria Online|Jenny Online|Michelle Online/.test(x.name)) ||
      v.find(x => /Samantha|Karen|Moira|Tessa/.test(x.name)) ||
      v.find(x => /Google UK English Female|Google US English Female/.test(x.name)) ||
      v.find(x => /Victoria|Zira/.test(x.name)) ||
      v.find(x => x.lang === 'en-US' && !/male/i.test(x.name)) ||
      v.find(x => x.lang.startsWith('en-')) ||
      v[0]
    );
  };

  const speakWebSpeech = (clean, onEnd) => {
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map(s => s.trim()).filter(Boolean) || [clean];
    let idx = 0;

    keepAliveRef.current = setInterval(() => {
      if (synthRef.current.speaking && !synthRef.current.paused) {
        synthRef.current.pause();
        synthRef.current.resume();
      }
    }, 10000);

    const finish = () => { clearKeepAlive(); setIsSpeaking(false); onEnd?.(); };

    const next = () => {
      if (idx >= sentences.length) { finish(); return; }
      const u = new SpeechSynthesisUtterance(sentences[idx]);
      u.volume = getVolume();
      u.rate = 0.88;
      u.pitch = 1.1;
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) { const v = getBestVoice(); if (v) u.voice = v; }
      else { synthRef.current.addEventListener('voiceschanged', () => { const v = getBestVoice(); if (v) u.voice = v; }, { once: true }); }
      u.onstart = () => { if (idx === 0) setIsSpeaking(true); };
      u.onend = () => { idx++; next(); };
      u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') { finish(); return; } idx++; next(); };
      synthRef.current.speak(u);
    };

    next();
  };

  const speak = useCallback((text, onEnd) => {
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
          audio.play().catch(() => { URL.revokeObjectURL(url); elAudioRef.current = null; setIsSpeaking(false); speakWebSpeech(clean, onEnd); });
        })
        .catch(() => { setIsSpeaking(false); speakWebSpeech(clean, onEnd); });
      return;
    }

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
