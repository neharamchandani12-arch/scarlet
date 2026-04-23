import { useMemo } from 'react';

const COLORS = ['#ff8fab', '#e9c46a', '#c77dff', '#ff8fab', '#ff8fab'];

export default function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${8 + Math.random() * 10}s`,
      size: Math.random() > 0.6 ? 3 : 2,
      color: COLORS[i % COLORS.length],
    })), []
  );

  return (
    <div className="particles-bg">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: p.left, bottom: 0,
          width: p.size, height: p.size,
          background: p.color,
          boxShadow: `0 0 4px ${p.color}`,
          animationDelay: p.delay,
          animationDuration: p.duration,
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}
