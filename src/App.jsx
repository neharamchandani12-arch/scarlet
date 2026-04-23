import { useState, useEffect, useCallback, useRef } from 'react';
import './styles/cyberpunk.css';

import Particles from './components/Particles';
import ScarletAvatar from './components/ScarletAvatar';
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
import ThemeSwitcher from './components/ThemeSwitcher';
import VoiceSettings from './components/VoiceSettings';
import BodyProgress from './components/BodyProgress';

import { useSpeech } from './hooks/useSpeech';
import { askScarlet, analyzeImage, parseFoodResponse, estimateMicroplastics } from './hooks/useGroq';
import {
  getChat, saveChat, addMeal, checkAndUpdateStreak,
  addPinned, saveRecipe, deleteRecipe, addMicroplastics,
  getTheme,
} from './utils/storage';

export default function App() {
  const [tab, setTab] = useState('home');
  const [messages, setMessages] = useState(() => getChat());
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const [pendingFood, setPendingFood] = useState(null);
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useSpeech();
  const inputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    checkAndUpdateStreak();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
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
      let speechStarted = false;

      await askScarlet(apiMessages, (delta, full) => {
        fullText = full;
        const parsed = parseFoodResponse(full);
        updateLastMessage(prev => ({
          ...prev,
          content: full,
          displayText: parsed.isFoodData
            ? parsed.notes || `${parsed.name}: ${parsed.calories} kcal, ${parsed.protein}g protein`
            : full,
        }));

        // Auto-speak as soon as we have enough text (first sentence)
        if (fromVoice && !speechStarted && !parsed.isFoodData) {
          const sentences = full.match(/[^.!?]+[.!?]/g);
          if (sentences && sentences.length >= 1 && full.length > 30) {
            speechStarted = true;
            speak(full);
          }
        }
      });

      setTyping(false);
      const parsed = parseFoodResponse(fullText);

      if (parsed.isFoodData) {
        setPendingFood(parsed);
        updateLastMessage(prev => ({
          ...prev,
          content: fullText,
          displayText: `${parsed.name}: ${parsed.calories} kcal, ${parsed.protein}g protein`,
          foodData: parsed,
        }));
        if (fromVoice) speak(`${parsed.name}. ${parsed.calories} calories, ${parsed.protein} grams protein. Want me to log it?`);
      } else if (parsed.isRecipeAction === 'save') {
        saveRecipe({ name: parsed.name, calories: parsed.calories, protein: parsed.protein || 0 });
        const reply = `Saved "${parsed.name}" as a recipe.`;
        updateLastMessage(prev => ({ ...prev, content: reply, displayText: reply }));
        if (fromVoice && !speechStarted) speak(reply);
      } else if (parsed.isRecipeAction === 'delete') {
        deleteRecipe(parsed.name);
        const reply = `Deleted recipe "${parsed.name}".`;
        updateLastMessage(prev => ({ ...prev, content: reply, displayText: reply }));
        if (fromVoice && !speechStarted) speak(reply);
      } else {
        // Speak full response if auto-speak didn't fire yet
        if (fromVoice && !speechStarted) {
          const cleanText = fullText.replace(/[*_`#]/g, '').trim();
          if (cleanText) speak(cleanText);
        }
      }
    } catch (err) {
      setTyping(false);
      const errMsg = 'Something went wrong. Try again.';
      updateLastMessage(prev => ({ ...prev, content: errMsg, displayText: errMsg }));
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
        <ThemeSwitcher onThemeChange={setTheme} />
        <div style={{
          fontFamily: 'Orbitron', fontSize: 16, fontWeight: 900, letterSpacing: 4,
          background: 'linear-gradient(135deg, var(--neon), var(--neon2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          SCARLET
        </div>
        <VoiceSettings />
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

            {/* Avatar + calories side by side */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <ScarletAvatar speaking={isSpeaking} />
              <div style={{ flex: 1 }}>
                <CaloriesRemaining />
              </div>
            </div>

            {/* Saved recipes bar */}
            <SavedRecipes />

            {/* Chat card */}
            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 280, maxHeight: '55vh' }}>
              <ChatHistory messages={messages} typing={typing} />

              {/* Log food button */}
              {pendingFood && (
                <button className="btn-solid" style={{ marginBottom: 10, fontSize: 13 }} onClick={logPendingFood}>
                  + Log {pendingFood.name} ({pendingFood.calories} kcal)
                </button>
              )}

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
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Ask Scarlet anything..."
                  style={{ flex: 1 }}
                  disabled={typing}
                />
                <MicButton isListening={isListening} isSpeaking={isSpeaking} onClick={handleMic} disabled={typing} />
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

      {showCamera && <CameraCapture onCapture={handleCameraResult} onClose={() => setShowCamera(false)} />}
      {showBarcode && <BarcodeScanner onResult={handleBarcodeResult} onClose={() => setShowBarcode(false)} />}
    </div>
  );
}
