export default function Waveform({ active, bars = 12 }) {
  if (!active) return null;
  return (
    <div className="waveform" style={{ justifyContent: 'center' }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{ animationDelay: `${i * 0.08}s`, animationDuration: `${0.6 + (i % 3) * 0.2}s` }}
        />
      ))}
    </div>
  );
}
