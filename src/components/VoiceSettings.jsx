import { getVolume, setVolume } from '../utils/storage';
import { useState } from 'react';

export default function VoiceSettings() {
  const [vol, setVol] = useState(getVolume());

  function change(e) {
    const v = parseFloat(e.target.value);
    setVol(v);
    setVolume(v);
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--text2)' }}>🔊</span>
      <input
        type="range" min="0" max="1" step="0.1" value={vol}
        onChange={change}
        style={{ width: 80, accentColor: 'var(--neon)', cursor: 'pointer' }}
      />
    </div>
  );
}
