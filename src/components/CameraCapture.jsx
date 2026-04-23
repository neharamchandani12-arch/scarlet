import { useState, useRef, useCallback } from 'react';

export default function CameraCapture({ onCapture, onClose }) {
  const [mode, setMode] = useState('choose'); // choose | camera | preview
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setMode('camera');
    } catch {
      alert('Camera not available');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const b64 = dataUrl.split(',')[1];
    setPreview(dataUrl);
    setBase64(b64);
    stopCamera();
    setMode('preview');
  }, [stopCamera]);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const b64 = dataUrl.split(',')[1];
      setPreview(dataUrl);
      setBase64(b64);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  }, []);

  const confirm = () => {
    onCapture(base64, preview);
    stopCamera();
    onClose();
  };

  const reset = () => {
    stopCamera();
    setPreview(null);
    setBase64(null);
    setMode('choose');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20,
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 300 }}>
          <div style={{ textAlign: 'center', color: 'var(--neon)', fontFamily: 'Orbitron', fontSize: 14 }}>
            IDENTIFY FOOD
          </div>
          <button className="btn-solid" onClick={startCamera}>📷 Take Photo</button>
          <button className="btn-neon" onClick={() => fileRef.current.click()}>🖼 Upload from Gallery</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <button className="btn-neon" onClick={onClose} style={{ borderColor: 'var(--text2)', color: 'var(--text2)' }}>Cancel</button>
        </div>
      )}

      {mode === 'camera' && (
        <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--neon)', borderRadius: 8, pointerEvents: 'none', boxShadow: 'inset 0 0 20px rgba(255,45,120,0.2)' }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
            <button className="btn-solid" style={{ fontSize: 20, padding: '12px 32px' }} onClick={capturePhoto}>📸</button>
            <button className="btn-neon" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-solid" style={{ flex: 1 }} onClick={confirm}>Analyze Food</button>
            <button className="btn-neon" onClick={reset}>Retake</button>
          </div>
        </div>
      )}
    </div>
  );
}
