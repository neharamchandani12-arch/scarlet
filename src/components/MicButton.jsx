export default function MicButton({ isListening, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 56, height: 56, borderRadius: '50%',
        border: `2px solid ${isListening ? 'var(--neon2)' : 'var(--neon)'}`,
        background: isListening ? 'var(--neon2)' : 'transparent',
        color: isListening ? 'var(--bg)' : 'var(--neon)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, transition: 'all 0.2s',
        boxShadow: isListening ? '0 0 20px var(--neon2)' : '0 0 10px rgba(255,45,120,0.3)',
        animation: isListening ? 'pulse-glow 1s infinite' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      title={isListening ? 'Stop listening' : 'Start listening'}
    >
      {isListening ? '⏹' : '🎤'}
    </button>
  );
}
