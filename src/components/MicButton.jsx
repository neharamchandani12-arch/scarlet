export default function MicButton({ isListening, isSpeaking, onClick, disabled }) {
  const state = isListening ? 'listening' : isSpeaking ? 'speaking' : 'idle';

  const styles = {
    idle: {
      background: 'rgba(255,255,255,0.04)',
      border: '2px solid rgba(255,255,255,0.2)',
      color: 'rgba(255,255,255,0.7)',
      boxShadow: 'none',
      animation: 'none',
    },
    listening: {
      background: 'rgba(148,0,211,0.18)',
      border: '2px solid #9400d3',
      color: '#cc44ff',
      boxShadow: '0 0 24px rgba(148,0,211,0.5)',
      animation: 'listening-pulse 0.9s infinite',
    },
    speaking: {
      background: 'rgba(255,0,64,0.15)',
      border: '2px solid #ff0040',
      color: '#ff0040',
      boxShadow: '0 0 24px rgba(255,0,64,0.5)',
      animation: 'speaking-pulse 0.9s infinite',
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 64, height: 64,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        transition: 'all 0.2s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        ...styles[state],
      }}
    >
      {isListening ? '⏹' : isSpeaking ? '🔊' : '🎙'}
    </button>
  );
}
