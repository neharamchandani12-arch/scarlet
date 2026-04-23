import { useState, useEffect, useCallback, useRef } from 'react';
import './styles/cyberpunk.css';

import Particles from './components/Particles';
import CaloriesRemaining from './components/CaloriesRemaining';
import ChatHistory from './components/ChatHistory';
import MicButton from './components/MicButton';
import Waveform from './components/Waveform';
import MealLog from './components/MealLog';
import CameraCapture from './components/CameraCapture';
import BarcodeScanner from './components/BarcodeScanner';
import PinnedFoods from './components/PinnedFoods';
import SavedRecipes from './components/SavedRecipes';
import WeeklyReport from './components/WeeklyReport';
import VoiceSettings from './components/VoiceSettings';
import BodyProgress from './components/BodyProgress';

import { useSpeech } from './hooks/useSpeech';
import { askScarlet, analyzeImage, parseFoodResponse, getStreamDisplayText, estimateMicroplastics } from './hooks/useGroq';
import {
  getChat, saveChat, addMeal, checkAndUpdateStreak,
  addPinned, saveRecipe, deleteRecipe, addMicroplastics,
  getTheme, getCaloriesRemaining, getProteinConsumed, getProteinGoal,
  getMicroplasticsToday,
} from './utils/storage';

function scheduleISTNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const notifications = [
    { hour: 19, min: 0, title: 'Scarlet', body: () => `You have ${getCaloriesRemaining()} calories left today. Make them count.` },
    { hour: 21, min: 0, title: 'Scarlet', body: () => { const rem = getProteinGoal() - getProteinConsumed(); return rem > 0 ? `You still need ${rem}g of protein today. Don't let me down.` : `Protein goal hit. Impressed.`; } },
    { hour: 22, min: 0, title: 'Scarlet', body: () => { const mp = getMicroplasticsToday(); return `Today you consumed ~${mp.total} microplastic particles. Biggest culprit: ${mp.biggest || 'unknown'}.`; } },
  ];
  notifications.forEach(({ hour, min, title, body }) => {
    const now = new Date();
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    const fireIST = new Date(nowIST);
    fireIST.setHours(hour, min, 0, 0);
    if (fireIST <= nowIST) fireIST.setDate(fireIST.getDate() + 1);
    const msUntil = fireIST - nowIST;
    setTimeout(() => {
      new Notification(title, { body: body(), icon: '/icon-192.png' });
    }, msUntil);
  });
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [messages, setMessages] = useState(() => getChat());
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [theme] = useState(getTheme());
  const [pendingFood, setPendingFood] = useState(null);
  const [microplastics, setMicroplastics] = useState(() => getMicroplasticsToday());
  const [showBodyUpload, setShowBodyUpload] = useState(false);
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useSpeech();
  const inputRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  // Unlock browser audio on first user interaction so speech plays after async delays
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().then(() => { ctx.close(); audioUnlockedRef.current = true; });
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    checkAndUpdateStreak();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(() => scheduleISTNotifications());
    } else if (Notification.permission === 'granted') {
      scheduleISTNotifications();
    }
  }, []);

  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      saveChat(updated);
      return updated;
    });
  }, []);

  const updateLastMessage = useCallback((updater) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = updater(updated[updated.length - 1]);
      saveChat(updated);
      return updated;
    });
  }, []);

  const sendMessage = useCallback(async (text, fromVoice = false) => {
    if (!text.trim()) return;
    // Stop command — halt speech immediately
    const stopWords = ['stop', 'stop talking', 'shut up', 'quiet', 'pause', 'shush'];
    if (stopWords.includes(text.trim().toLowerCase())) {
      stopSpeaking();
      return;
    }
    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    addMessage(userMsg);
    setInput('');
    setTyping(true);

    const assistantMsg = { role: 'assistant', content: '', displayText: '' };
    addMessage(assistantMsg);

    try {
      const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
      let fullText = '';

      await askScarlet(apiMessages, (delta, full) => {
        fullText = full;
        const parsed = parseFoodResponse(full);
        const streamDisplay = (parsed.isFoodData || parsed.isMealData)
          ? null
          : getStreamDisplayText(full) ?? full;
        updateLastMessage(prev => ({
          ...prev,
          content: full,
          displayText: streamDisplay ?? prev.displayText ?? '',
        }));
      });

      setTyping(false);
      const parsed = parseFoodResponse(fullText);

      // say() — sets display text and speaks the exact same string
      const say = (text) => {
        updateLastMessage(prev => ({ ...prev, displayText: text }));
        try { speak(text); } catch (e) { console.error('speak error', e); }
      };

      const logFood = (name, calories, protein) => {
        addMeal({ name, calories, protein: protein || 0 });
        addMicroplastics(name, estimateMicroplastics(name));
        addPinned({ name, calories, protein: protein || 0 });
        setMicroplastics(getMicroplasticsToday());
        checkAndUpdateStreak();
      };

      if (parsed.isMealData) {
        const mealSummary = { name: parsed.name, calories: parsed.calories, protein: parsed.protein };
        logFood(mealSummary.name, mealSummary.calories, mealSummary.protein);
        updateLastMessage(prev => ({ ...prev, foodData: { ...mealSummary, isFoodData: true, logged: true } }));
        say(`Logged ${parsed.name}. ${parsed.calories} calories, ${parsed.protein} grams protein.`);
      } else if (parsed.isFoodData) {
        logFood(parsed.name, parsed.calories, parsed.protein);
        updateLastMessage(prev => ({ ...prev, foodData: { ...parsed, logged: true } }));
        say(`Logged ${parsed.name}. ${parsed.calories} calories, ${parsed.protein} grams protein.`);
      } else if (parsed.isRecipeAction === 'save') {
        saveRecipe({ name: parsed.name, calories: parsed.calories, protein: parsed.protein || 0 });
        say(`Saved ${parsed.name} as a recipe. ${parsed.calories} calories, ${parsed.protein || 0} grams protein. Tap it above to log anytime.`);
      } else if (parsed.isRecipeAction === 'delete') {
        deleteRecipe(parsed.name);
        say(`Deleted the ${parsed.name} recipe.`);
      } else {
        const cleanText = fullText.replace(/\{[\s\S]*?\}/g, '').replace(/[*_`#]/g, '').trim();
        if (cleanText) say(cleanText);
        else updateLastMessage(prev => ({ ...prev, displayText: prev.displayText || fullText }));
      }
    } catch (err) {
      setTyping(false);
      const msg = err?.status === 429 ? 'Rate limit hit — wait a moment and try again.'
        : err?.status === 401 ? 'API key error — check Vercel environment variables.'
        : `Error: ${err?.message || err?.toString() || 'unknown'}. Try again.`;
      updateLastMessage(prev => ({ ...prev, content: msg, displayText: msg }));
    }
  }, [messages, addMessage, updateLastMessage, speak]);

  const handleMic = useCallback(() => {
    if (isSpeaking) { stopSpeaking(); return; }
    if (isListening) { stopListening(); return; }
    startListening(
      (transcript) => sendMessage(transcript, true),
      () => {}
    );
  }, [isListening, isSpeaking, stopListening, stopSpeaking, startListening, sendMessage]);

  const handleCameraResult = useCallback(async (base64) => {
    setTyping(true);
    addMessage({ role: 'user', content: '📷 Photo sent for analysis', displayText: '📷 Photo sent for analysis' });
    addMessage({ role: 'assistant', content: '', displayText: '' });
    try {
      const result = await analyzeImage(base64);
      const parsed = parseFoodResponse(result);
      setTyping(false);
      if (parsed.isFoodData) {
        setPendingFood(parsed);
        updateLastMessage(prev => ({
          ...prev, content: result,
          displayText: `${parsed.name}: ${parsed.calories} kcal, ${parsed.protein}g protein`,
          foodData: parsed,
        }));
      } else {
        updateLastMessage(prev => ({ ...prev, content: result, displayText: result }));
      }
    } catch {
      setTyping(false);
      updateLastMessage(prev => ({ ...prev, content: 'Could not analyze image.', displayText: 'Could not analyze image.' }));
    }
  }, [addMessage, updateLastMessage]);

  const handleBarcodeResult = useCallback((data) => {
    addMessage({ role: 'user', content: `Scanned: ${data.name}` });
    addMessage({
      role: 'assistant',
      content: `${data.name}: ${data.calories} kcal, ${data.protein}g protein (per ${data.servingSize})`,
      displayText: `${data.name}: ${data.calories} kcal, ${data.protein}g protein (per ${data.servingSize})`,
      foodData: { ...data, isFoodData: true },
    });
    setPendingFood(data);
  }, [addMessage]);

  function logPendingFood() {
    if (!pendingFood) return;
    addMeal({ name: pendingFood.name, calories: pendingFood.calories, protein: pendingFood.protein || 0 });
    addMicroplastics(pendingFood.name, estimateMicroplastics(pendingFood.name));
    addPinned({ name: pendingFood.name, calories: pendingFood.calories, protein: pendingFood.protein || 0 });
    updateLastMessage(prev => ({ ...prev, foodData: { ...prev.foodData, logged: true } }));
    setPendingFood(null);
    setMicroplastics(getMicroplasticsToday());
    checkAndUpdateStreak();
  }

  const TABS = [
    { id: 'home', label: 'Chat' },
    { id: 'log', label: 'Log' },
    { id: 'stats', label: 'Stats' },
    { id: 'body', label: 'Body' },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="scanlines" />
      <Particles />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8,6,18,0.92)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ width: 60 }} />
        <div style={{
          fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900, letterSpacing: 5,
          background: 'linear-gradient(135deg, #ff0040 0%, #cc44ff 50%, #9400d3 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          filter: 'drop-shadow(0 0 12px rgba(255,0,64,0.4))',
        }}>
          SCARLET
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <VoiceSettings />
          <button
            onClick={() => {
              if (window.confirm('Clear chat history? Your meal log and goals will stay.')) {
                localStorage.removeItem('scarlet_chat');
                setMessages([]);
              }
            }}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text2)', borderRadius: 8, padding: '5px 10px',
              fontSize: 11, cursor: 'pointer', fontFamily: 'Inter',
            }}
            title="Clear chat"
          >New Chat</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ position: 'relative', zIndex: 10 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 5, padding: '16px' }}>

        {/* HOME TAB */}
        {tab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480, margin: '0 auto' }}>

            <CaloriesRemaining />

            {/* Body Analysis button — always visible */}
            <button
              className="btn-neon"
              style={{ width: '100%', padding: '10px 14px', fontSize: 12, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
              onClick={() => setTab('body')}
            >
              <span style={{ fontSize: 18 }}>📸</span>
              <span>
                <span style={{ fontWeight: 700, letterSpacing: 1 }}>BODY ANALYSIS</span>
                <span style={{ color: 'var(--text2)', marginLeft: 8, fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>upload a photo for Scarlet's assessment</span>
              </span>
            </button>

            {/* Microplastics tracker — always visible */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,143,171,0.15)',
              fontSize: 11, color: 'var(--text2)',
            }}>
              <span style={{ fontSize: 14 }}>🧫</span>
              <div style={{ flex: 1 }}>
                <span style={{ color: microplastics.total > 0 ? 'var(--text)' : 'var(--text2)' }}>
                  {microplastics.total > 0
                    ? `~${microplastics.total.toLocaleString()} microplastic particles today`
                    : 'Microplastics tracker — log food to start'}
                </span>
              </div>
              {microplastics.biggest && (
                <span style={{ color: 'var(--neon)', flexShrink: 0 }}>{microplastics.biggest}</span>
              )}
            </div>

            {/* Saved recipes bar */}
            <SavedRecipes />

            {/* Chat card */}
            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 280, maxHeight: '55vh' }}>
              <ChatHistory messages={messages} typing={typing} />

              {/* Waveform while listening/speaking */}
              {(isListening || isSpeaking) && (
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Waveform active bars={10} />
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {isListening ? 'listening...' : 'speaking...'}
                  </span>
                </div>
              )}

              {/* Input row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn-neon"
                  style={{ padding: '9px 11px', fontSize: 15, flexShrink: 0, borderRadius: 10 }}
                  onClick={() => setShowCamera(true)}
                  title="Identify food from photo"
                >📷</button>
                <button
                  className="btn-neon"
                  style={{ padding: '9px 11px', fontSize: 15, flexShrink: 0, borderRadius: 10 }}
                  onClick={() => setShowBarcode(true)}
                  title="Scan barcode"
                >⬛</button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => { unlockAudio(); setInput(e.target.value); }}
                  onKeyDown={e => { unlockAudio(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Ask Scarlet anything..."
                  style={{ flex: 1 }}
                  disabled={typing}
                />
                <MicButton isListening={isListening} isSpeaking={isSpeaking} onClick={() => { unlockAudio(); handleMic(); }} disabled={typing} />
              </div>
            </div>
          </div>
        )}

        {/* LOG TAB */}
        {tab === 'log' && (
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontWeight: 500 }}>
                pinned foods
              </div>
              <PinnedFoods />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontWeight: 500 }}>
                today's meals
              </div>
              <MealLog />
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <WeeklyReport />
          </div>
        )}

        {/* BODY TAB */}
        {tab === 'body' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <BodyProgress />
          </div>
        )}
      </div>

      {/* Corner wave — loud animated bars bottom-right when active */}
      {(isListening || isSpeaking) && (
        <div className="corner-wave">
          {[55, 90, 70, 100, 60, 85, 45, 75, 95, 65].map((peak, i) => (
            <div
              key={i}
              className={`corner-wave-bar ${isSpeaking ? 'speaking' : 'listening'}`}
              style={{
                '--peak': `${peak}px`,
                animationDelay: `${i * 0.08}s`,
                animationDuration: `${0.55 + (i % 3) * 0.12}s`,
              }}
            />
          ))}
        </div>
      )}

      {showCamera && <CameraCapture onCapture={handleCameraResult} onClose={() => setShowCamera(false)} />}
      {showBarcode && <BarcodeScanner onResult={handleBarcodeResult} onClose={() => setShowBarcode(false)} />}
    </div>
  );
}
