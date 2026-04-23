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
  const [refresh, setRefresh] = useState(0);
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

  const forceRefresh = useCallback(() => setRefresh(r => r + 1), []);

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
        if (fromVoice) speak(`${parsed.name}. ${parsed.calories} calories, ${parsed.protein} grams protein. Log it?`);
      } else if (parsed.isRecipeAction === 'save') {
        saveRecipe({ name: parsed.name, calories: parsed.calories, protein: parsed.protein || 0 });
        forceRefresh();
        const reply = `Saved "${parsed.name}" as a recipe.`;
        updateLastMessage(prev => ({ ...prev, content: reply, displayText: reply }));
        if (fromVoice) speak(reply);
      } else if (parsed.isRecipeAction === 'delete') {
        deleteRecipe(parsed.name);
        forceRefresh();
        const reply = `Deleted recipe "${parsed.name}".`;
        updateLastMessage(prev => ({ ...prev, content: reply, displayText: reply }));
        if (fromVoice) speak(reply);
      } else {
        const cleanText = fullText.replace(/[*_`#]/g, '').trim();
        if (fromVoice && cleanText) speak(cleanText);
      }
    } catch (err) {
      setTyping(false);
      const errMsg = 'Connection error. Try again.';
      updateLastMessage(prev => ({ ...prev, content: errMsg, displayText: errMsg }));
    }
  }, [messages, addMessage, updateLastMessage, forceRefresh, speak]);

  const handleMic = useCallback(() => {
    if (isListening) { stopListening(); return; }
    if (isSpeaking) { stopSpeaking(); return; }
    startListening(
      (transcript) => sendMessage(transcript, true),
      () => {}
    );
  }, [isListening, isSpeaking, stopListening, stopSpeaking, startListening, sendMessage]);

  const handleCameraResult = useCallback(async (base64) => {
    setTyping(true);
    addMessage({ role: 'user', content: '📷 [Photo of food]', displayText: '📷 Photo sent for analysis' });
    addMessage({ role: 'assistant', content: '', displayText: '' });
    try {
      const result = await analyzeImage(base64);
      const parsed = parseFoodResponse(result);
      setTyping(false);
      if (parsed.isFoodData) {
        setPendingFood(parsed);
        updateLastMessage(prev => ({
          ...prev,
          content: result,
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
    addMessage({ role: 'user', content: `📦 Scanned: ${data.name}` });
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
    const particles = estimateMicroplastics(pendingFood.name);
    addMicroplastics(pendingFood.name, particles);
    addPinned({ name: pendingFood.name, calories: pendingFood.calories, protein: pendingFood.protein || 0 });
    updateLastMessage(prev => ({ ...prev, foodData: { ...prev.foodData, logged: true } }));
    setPendingFood(null);
    checkAndUpdateStreak();
    forceRefresh();
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="scanlines" />
      <Particles />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(10px)',
      }}>
        <ThemeSwitcher onThemeChange={setTheme} />
        <div style={{ fontFamily: 'Orbitron', fontSize: 16, color: 'var(--neon)', textShadow: 'var(--glow)' }}>
          SCARLET
        </div>
        <VoiceSettings />
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ position: 'relative', zIndex: 10 }}>
        {[
          { id: 'home', label: 'Chat' },
          { id: 'log', label: 'Log' },
          { id: 'stats', label: 'Stats' },
          { id: 'body', label: 'Body' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 5, padding: '16px' }}>
        {tab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <ScarletAvatar speaking={isSpeaking} />
              <div style={{ flex: 1 }}>
                <CaloriesRemaining onUpdate={forceRefresh} key={refresh} />
              </div>
            </div>

            <SavedRecipes onUpdate={forceRefresh} key={`recipes-${refresh}`} />

            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 300, maxHeight: '55vh' }}>
              <ChatHistory messages={messages} typing={typing} />

              {pendingFood && (
                <button className="btn-solid" style={{ marginBottom: 8 }} onClick={logPendingFood}>
                  + Log {pendingFood.name} ({pendingFood.calories} kcal)
                </button>
              )}

              {(isListening || isSpeaking) && (
                <div style={{ marginBottom: 8 }}>
                  <Waveform active={isListening || isSpeaking} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-neon" style={{ padding: '8px 10px', fontSize: 16, flexShrink: 0 }}
                  onClick={() => setShowCamera(true)} title="Take photo">📷</button>
                <button className="btn-neon" style={{ padding: '8px 10px', fontSize: 16, flexShrink: 0 }}
                  onClick={() => setShowBarcode(true)} title="Scan barcode">📦</button>
                <input
                  ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Ask Scarlet..."
                  style={{ flex: 1, fontSize: 13 }}
                  disabled={typing}
                />
                <MicButton isListening={isListening} onClick={handleMic} disabled={typing} />
              </div>
            </div>
          </div>
        )}

        {tab === 'log' && (
          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2 }}>
              quick log — pinned foods
            </div>
            <PinnedFoods onUpdate={forceRefresh} key={`pinned-${refresh}`} />
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2 }}>
              today's meals
            </div>
            <MealLog onUpdate={forceRefresh} key={`meals-${refresh}`} />
          </div>
        )}

        {tab === 'stats' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <WeeklyReport key={refresh} />
          </div>
        )}

        {tab === 'body' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <BodyProgress key={refresh} />
          </div>
        )}
      </div>

      {showCamera && <CameraCapture onCapture={handleCameraResult} onClose={() => setShowCamera(false)} />}
      {showBarcode && <BarcodeScanner onResult={handleBarcodeResult} onClose={() => setShowBarcode(false)} />}
    </div>
  );
}
