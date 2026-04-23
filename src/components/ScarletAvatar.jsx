export default function ScarletAvatar({ speaking }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Avatar ring — glows when speaking */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: `2px solid ${speaking ? 'var(--neon)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxShadow: speaking
          ? '0 0 16px rgba(255,143,171,0.8), 0 0 40px rgba(255,143,171,0.4), 0 0 60px rgba(255,143,171,0.2)'
          : '0 0 0 rgba(255,143,171,0)',
        animation: speaking ? 'speaking-pulse 0.9s ease-in-out infinite' : 'none',
        background: 'radial-gradient(circle at 40% 35%, rgba(255,143,171,0.12), rgba(20,12,40,0.9))',
      }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Face base */}
          <circle cx="28" cy="28" r="26" fill="url(#faceGrad)" />
          {/* Hair */}
          <path d="M6 24 Q8 6 28 6 Q48 6 50 24" fill="url(#hairGrad)" />
          <path d="M6 24 Q4 28 6 34" stroke="url(#hairGrad)" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M50 24 Q52 28 50 34" stroke="url(#hairGrad)" strokeWidth="4" fill="none" strokeLinecap="round"/>
          {/* Eyes */}
          <g style={{ filter: speaking ? 'drop-shadow(0 0 6px var(--neon))' : 'drop-shadow(0 0 2px var(--neon))', transition: 'filter 0.3s' }}>
            <ellipse cx="20" cy="27" rx="4.5" ry="3.5" fill="var(--neon)" />
            <ellipse cx="36" cy="27" rx="4.5" ry="3.5" fill="var(--neon)" />
            <circle cx="21" cy="26" r="1.5" fill="#080612" />
            <circle cx="37" cy="26" r="1.5" fill="#080612" />
            <circle cx="21.8" cy="25.2" r="0.7" fill="white" opacity="0.9"/>
            <circle cx="37.8" cy="25.2" r="0.7" fill="white" opacity="0.9"/>
          </g>
          {/* Nose */}
          <path d="M26.5 31.5 L28 34 L29.5 31.5" stroke="rgba(255,143,171,0.4)" strokeWidth="1" fill="none" strokeLinecap="round"/>
          {/* Lips */}
          <path d="M22 39 Q28 44 34 39" stroke="var(--neon)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M22 39 Q25 41 28 39 Q31 41 34 39" fill="rgba(255,143,171,0.25)"/>
          {/* Cheek blush */}
          <ellipse cx="15" cy="33" rx="4" ry="2.5" fill="var(--neon)" opacity={speaking ? 0.3 : 0.15}/>
          <ellipse cx="41" cy="33" rx="4" ry="2.5" fill="var(--neon)" opacity={speaking ? 0.3 : 0.15}/>
          {/* Tech accent lines */}
          <line x1="2" y1="28" x2="8" y2="28" stroke="var(--neon2)" strokeWidth="1" opacity="0.5"/>
          <line x1="48" y1="28" x2="54" y2="28" stroke="var(--neon2)" strokeWidth="1" opacity="0.5"/>
          <circle cx="2" cy="28" r="1" fill="var(--neon2)" opacity="0.6"/>
          <circle cx="54" cy="28" r="1" fill="var(--neon2)" opacity="0.6"/>
          <defs>
            <radialGradient id="faceGrad" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#2a1840"/>
              <stop offset="100%" stopColor="#120a22"/>
            </radialGradient>
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c77dff"/>
              <stop offset="100%" stopColor="#ff8fab"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Name */}
      <span
        className="glitch"
        data-text="SCARLET"
        style={{
          fontFamily: 'Orbitron', fontSize: 15, fontWeight: 900,
          letterSpacing: 5,
          background: 'linear-gradient(135deg, var(--neon), var(--neon2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >SCARLET</span>
    </div>
  );
}
