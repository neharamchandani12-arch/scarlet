import { getTheme, setTheme } from '../utils/storage';

const THEMES = [
  { id: 'rose', color: '#ff8fab' },
  { id: 'violet', color: '#c77dff' },
  { id: 'gold', color: '#e9c46a' },
];

export default function ThemeSwitcher({ onThemeChange }) {
  const current = getTheme();

  function select(id) {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    onThemeChange?.(id);
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => select(t.id)}
          style={{
            width: 18, height: 18, borderRadius: '50%',
            background: t.color,
            border: `2px solid ${current === t.id ? 'white' : 'transparent'}`,
            boxShadow: current === t.id ? `0 0 10px ${t.color}` : 'none',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        />
      ))}
    </div>
  );
}
