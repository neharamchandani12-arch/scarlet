import { useState, useRef } from 'react';
import { analyzeBodyPhoto } from '../hooks/useGroq';

function resizeToBase64(file, maxDim = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')); };
    img.src = url;
  });
}

function loadPhotos() {
  try { return JSON.parse(localStorage.getItem('scarlet_progress_photos') || '[]'); }
  catch { return []; }
}

function savePhotos(photos) {
  try {
    localStorage.setItem('scarlet_progress_photos', JSON.stringify(photos));
    return true;
  } catch {
    return false;
  }
}

export default function BodyProgress() {
  const [photos, setPhotos] = useState(loadPhotos);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function addPhoto(file) {
    setUploading(true);
    try {
      const dataUrl = await resizeToBase64(file);
      const newPhoto = { url: dataUrl, date: new Date().toISOString().split('T')[0], id: Date.now() };
      const updated = [newPhoto, ...photos];
      const ok = savePhotos(updated);
      if (!ok) {
        // Storage full — keep only last 5
        const trimmed = [newPhoto, ...photos.slice(0, 4)];
        savePhotos(trimmed);
        setPhotos(trimmed);
        alert('Storage almost full — keeping your 5 most recent photos.');
      } else {
        setPhotos(updated);
      }

      setAnalyzing(true);
      setUploading(false);
      try {
        const b64 = dataUrl.split(',')[1];
        const result = await analyzeBodyPhoto(b64);
        setAnalysis(result);
      } catch {
        setAnalysis('Could not analyze photo.');
      }
      setAnalyzing(false);
    } catch (err) {
      setUploading(false);
      alert('Could not load photo: ' + err.message);
    }
  }

  function deletePhoto(id) {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    savePhotos(updated);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 4px' }}>
      {/* Section header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--neon)', marginBottom: 4 }}>Body Analysis</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
          Upload progress photos and Scarlet will give you an honest assessment of your physique over time.
        </div>
      </div>

      {/* Upload CTA */}
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <button
          className="btn-solid"
          style={{ width: '100%', padding: 14, fontSize: 15 }}
          onClick={() => fileRef.current.click()}
          disabled={uploading || analyzing}
        >
          {uploading ? 'Loading photo...' : analyzing ? 'Analyzing...' : '📸 Add Progress Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) { addPhoto(e.target.files[0]); e.target.value = ''; } }} />
      </div>

      {/* Scarlet's analysis */}
      {analyzing && (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ color: 'var(--neon2)', fontSize: 13 }}>
            Scarlet is looking<span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        </div>
      )}
      {analysis && !analyzing && (
        <div className="card" style={{ padding: 16, borderColor: 'var(--neon)' }}>
          <div style={{ fontSize: 10, color: 'var(--neon)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
            Scarlet's Take
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{analysis}</div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {photos.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <img src={p.url} alt={p.date} style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 8, border: '1px solid var(--border)',
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  fontSize: 9, color: 'var(--text2)',
                  textAlign: 'center', padding: '12px 4px 4px',
                  borderRadius: '0 0 8px 8px',
                }}>{p.date}</div>
                <button
                  onClick={() => deletePhoto(p.id)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    color: 'white', borderRadius: '50%',
                    width: 20, height: 20, fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !uploading && !analyzing && (
          <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, padding: 20 }}>
            No photos yet. Add your first one above.
          </div>
        )
      )}
    </div>
  );
}
