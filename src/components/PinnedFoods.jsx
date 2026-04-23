import { getPinned, removePinned, addMeal } from '../utils/storage';

export default function PinnedFoods({ onUpdate }) {
  const pinned = getPinned();

  if (!pinned.length) return null;

  function logPinned(food) {
    addMeal({ name: food.name, calories: food.calories, protein: food.protein || 0 });
    onUpdate?.();
  }

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {pinned.map(food => (
        <div key={food.name} style={{
          flexShrink: 0, padding: '8px 12px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>{food.name}</div>
          <div style={{ fontSize: 10, color: 'var(--neon)' }}>{food.calories} kcal</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-solid" style={{ flex: 1, padding: '4px 6px', fontSize: 10 }} onClick={() => logPinned(food)}>
              Log
            </button>
            <button
              onClick={() => { removePinned(food.name); onUpdate?.(); }}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 3, padding: '4px 6px', fontSize: 10 }}
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
