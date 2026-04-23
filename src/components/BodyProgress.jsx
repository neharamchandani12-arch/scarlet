import { useState, useRef } from 'react';
import { getWeightLog, addWeight, getGoal } from '../utils/storage';
import { analyzeBodyPhoto } from '../hooks/useGroq';

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD;
const CLOUDINARY_UPLOAD_PRESET = 'scarlet_progress';

export default function BodyProgress() {
  const [photos, setPhotos] = useState(() => {
    const raw = localStorage.getItem('scarlet_progress_photos');
    return raw ? JSON.parse(raw) : [];
  });
  const [weightInput, setWeightInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [uploading, setUploading] = useState(false);
  const [targetWeight, setTargetWeight] = useState(localStorage.getItem('scarlet_target_weight') || '');
  const fileRef = useRef(null);
  const weightLog = getWeightLog();

  async function uploadPhoto(file) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST', body: formData,
      });
      const data = await res.json();
      const newPhoto = { url: data.secure_url, date: new Date().toISOString().split('T')[0], id: Date.now() };
      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      localStorage.setItem('scarlet_progress_photos', JSON.stringify(updated));

      // Auto-analyze latest
      const reader = new FileReader();
      reader.onload = async (e) => {
        setAnalyzing(true);
        const b64 = e.target.result.split(',')[1];
        const result = await analyzeBodyPhoto(b64);
        setAnalysis(result);
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  function logWeight() {
    if (!weightInput) return;
    addWeight(parseFloat(weightInput));
    setWeightInput('');
  }

  function saveTargetWeight() {
    localStorage.setItem('scarlet_target_weight', targetWeight);
  }

  const latestWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1].kg : null;
  const target = parseFloat(targetWeight);
  const deficit = getGoal() < 2500 ? 2500 - getGoal() : 500;
  const daysToGoal = latestWeight && target && latestWeight > target
    ? Math.round(((latestWeight - target) * 7700) / deficit)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 4px' }}>
      {/* Weight tracker */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          weight tracker
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="number" placeholder="kg" value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            style={{ flex: 1, fontSize: 14 }}
          />
          <button className="btn-solid" onClick={logWeight}>Log</button>
        </div>
        {latestWeight && (
          <div style={{ fontSize: 13, color: 'var(--neon)', marginBottom: 8 }}>
            Current: <strong>{latestWeight} kg</strong>
          </div>
        )}
        {weightLog.length > 1 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 50, marginBottom: 12 }}>
            {weightLog.slice(-14).map((w, i) => {
              const min = Math.min(...weightLog.slice(-14).map(x => x.kg));
              const max = Math.max(...weightLog.slice(-14).map(x => x.kg));
              const range = max - min || 1;
              const pct = ((w.kg - min) / range) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: '100%', height: `${Math.max(pct, 10)}%`,
                    background: 'var(--neon2)', borderRadius: 2, alignSelf: 'flex-end',
                  }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Target weight */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number" placeholder="target kg" value={targetWeight}
            onChange={e => setTargetWeight(e.target.value)}
            style={{ flex: 1, fontSize: 13 }}
          />
          <button className="btn-neon" style={{ fontSize: 11, padding: '8px' }} onClick={saveTargetWeight}>Set Target</button>
        </div>
        {daysToGoal && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--neon)' }}>
            At current deficit: ~{daysToGoal} days to goal
          </div>
        )}
      </div>

      {/* Upload progress photo */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          progress photos
        </div>
        <button
          className="btn-neon" style={{ width: '100%', marginBottom: 12 }}
          onClick={() => fileRef.current.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : '📸 Add Progress Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) uploadPhoto(e.target.files[0]); }} />

        {analyzing && (
          <div style={{ color: 'var(--neon2)', fontSize: 12, marginBottom: 8 }}>
            Scarlet is analyzing...<span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        )}
        {analysis && (
          <div className="card" style={{ padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, borderColor: 'var(--neon)' }}>
            <div style={{ fontSize: 10, color: 'var(--neon)', marginBottom: 6 }}>SCARLET'S ANALYSIS</div>
            {analysis}
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {photos.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <img src={p.url} alt={p.date} style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 4, border: '1px solid var(--border)',
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.7)', fontSize: 9, color: 'var(--text2)',
                  textAlign: 'center', padding: 2, borderRadius: '0 0 4px 4px',
                }}>{p.date}</div>
              </div>
            ))}
          </div>
        )}
        {!photos.length && (
          <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
            No photos yet — document your progress
          </div>
        )}
      </div>
    </div>
  );
}
