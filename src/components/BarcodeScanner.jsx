import { useRef } from 'react';
import { useBarcode } from '../hooks/useBarcode';

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const { scanning, scanBarcode, stopScanning } = useBarcode();

  const start = () => {
    scanBarcode(
      videoRef.current,
      (data) => { onResult(data); onClose(); },
      (err) => { alert('Could not read barcode: ' + err); }
    );
  };

  const cancel = () => { stopScanning(); onClose(); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20,
    }}>
      <div style={{ color: 'var(--neon)', fontFamily: 'Orbitron', fontSize: 14 }}>SCAN BARCODE</div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
        <video
          ref={videoRef}
          autoPlay playsInline
          style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
          onCanPlay={start}
        />
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px solid var(--neon2)', borderRadius: 8,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '40%', left: 10, right: 10, height: 2,
            background: 'var(--neon2)', boxShadow: '0 0 8px var(--neon2)',
          }} />
        </div>
      </div>

      {scanning && (
        <div style={{ color: 'var(--neon2)', fontSize: 12 }}>
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /> scanning
        </div>
      )}

      <button className="btn-neon" onClick={cancel}>Cancel</button>
    </div>
  );
}
