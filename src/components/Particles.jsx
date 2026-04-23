import { useMemo } from 'react';

export default function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 8}s`,
      size: Math.random() > 0.7 ? 3 : 2,
    })), []
  );

  return (
    <div className="particles-bg">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: p.left, bottom: 0,
          width: p.size, height: p.size,
          animationDelay: p.delay,
          animationDuration: p.duration,
        }} />
      ))}
    </div>
  );
}
