import { useState, useRef } from 'react';
import { analyzeBodyPhoto } from '../hooks/useGroq';

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD;
const CLOUDINARY_UPLOAD_PRESET = 'scarlet_progress';

export default function BodyProgress() {
  const [photos, setPhotos] = useState(() => {
    const raw = localStorage.getItem('scarlet_progress_photos');
    return raw ? JSON.parse(raw) : [];
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

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
      if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
      const newPhoto = { url: data.secure_url, date: new Date().toISOString().split('T')[0], id: Date.now() };
      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      localStorage.setItem('scarlet_progress_photos', JSON.stringify(updated));

      setAnalyzing(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const b64 = e.target.result.split(',')[1];
          const result = await analyzeBodyPhoto(b64);
          setAnalysis(result);
        } catch { setAnalysis('Could not analyze photo.'); }
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  function deletePhoto(id) {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    localStorage.setItem('scarlet_progress_photos', JSON.stringify(updated));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 4px' }}>
      {/* Upload CTA */}
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
          Upload a progress photo — Scarlet will give an honest assessment of your physique.
        </div>
        <button
          className="btn-solid"
          style={{ width: '100%', padding: 14, fontSize: 15 }}
          onClick={() => fileRef.current.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : '📸 Add Progress Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) uploadPhoto(e.target.files[0]); }} />
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
        !uploading && (
          <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, padding: 20 }}>
            No photos yet. Add your first one above.
          </div>
        )
      )}
    </div>
  );
}
