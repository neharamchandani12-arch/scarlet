export default function ScarletAvatar({ speaking }) {
  return (
    <div className={`scarlet-avatar ${speaking ? 'speaking' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring */}
        <circle cx="40" cy="40" r="38" stroke="var(--neon)" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
        {/* Face */}
        <circle cx="40" cy="40" r="30" fill="var(--bg2)" stroke="var(--neon)" strokeWidth="1.5" />
        {/* Hair accent */}
        <path d="M15 30 Q20 10 40 10 Q60 10 65 30" stroke="var(--neon)" strokeWidth="2" fill="none" opacity="0.8"/>
        {/* Eyes */}
        <g className="avatar-eyes">
          <ellipse cx="30" cy="38" rx="5" ry="4" fill="var(--neon)" />
          <ellipse cx="50" cy="38" rx="5" ry="4" fill="var(--neon)" />
          <circle cx="31" cy="37" r="1.5" fill="var(--bg)" />
          <circle cx="51" cy="37" r="1.5" fill="var(--bg)" />
          {/* Eye shine */}
          <circle cx="32" cy="36" r="0.8" fill="white" opacity="0.8" />
          <circle cx="52" cy="36" r="0.8" fill="white" opacity="0.8" />
        </g>
        {/* Nose */}
        <path d="M38 44 L40 48 L42 44" stroke="var(--neon2)" strokeWidth="1" fill="none" opacity="0.5"/>
        {/* Mouth */}
        <path d="M32 54 Q40 60 48 54" stroke="var(--neon)" strokeWidth="1.5" fill="none" />
        {/* Cheek blush */}
        <ellipse cx="24" cy="46" rx="5" ry="3" fill="var(--neon)" opacity="0.15"/>
        <ellipse cx="56" cy="46" rx="5" ry="3" fill="var(--neon)" opacity="0.15"/>
        {/* Tech details */}
        <line x1="10" y1="40" x2="18" y2="40" stroke="var(--neon2)" strokeWidth="1" opacity="0.5"/>
        <line x1="62" y1="40" x2="70" y2="40" stroke="var(--neon2)" strokeWidth="1" opacity="0.5"/>
      </svg>
      <span style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900, color: 'var(--neon)', textShadow: 'var(--glow)', letterSpacing: 4 }}
        className="glitch" data-text="SCARLET">SCARLET</span>
    </div>
  );
}
