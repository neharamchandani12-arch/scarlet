export default function MicButton({ isListening, isSpeaking, onClick, disabled }) {
  const active = isListening || isSpeaking;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 48, height: 48, borderRadius: '50%',
        border: `2px solid ${isListening ? 'var(--neon2)' : active ? 'var(--neon)' : 'var(--border)'}`,
        background: isListening
          ? 'rgba(233,196,106,0.15)'
          : active
          ? 'rgba(255,143,171,0.12)'
          : 'rgba(255,255,255,0.04)',
        color: isListening ? 'var(--neon2)' : 'var(--neon)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, transition: 'all 0.2s',
        boxShadow: active ? 'var(--glow)' : 'none',
        animation: isListening ? 'speaking-pulse 1s infinite' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {isListening ? '⏹' : isSpeaking ? '🔊' : '🎙'}
    </button>
  );
}
