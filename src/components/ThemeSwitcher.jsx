import { getTheme, setTheme } from '../utils/storage';

const THEMES = [
  { id: 'pink', label: 'Pink', color: '#ff2d78' },
  { id: 'cyan', label: 'Cyan', color: '#00fff7' },
  { id: 'purple', label: 'Purple', color: '#bf00ff' },
];

export default function ThemeSwitcher({ onThemeChange }) {
  const current = getTheme();

  function select(id) {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    onThemeChange?.(id);
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>theme</span>
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => select(t.id)}
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: t.color, border: `2px solid ${current === t.id ? 'white' : 'transparent'}`,
            boxShadow: current === t.id ? `0 0 8px ${t.color}` : 'none',
            cursor: 'pointer',
          }}
          title={t.label}
        />
      ))}
    </div>
  );
}
