import { useEffect, useState } from 'react';
import { getPinned, removePinned, addMeal } from '../utils/storage';

export default function PinnedFoods() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handler = () => forceRender(n => n + 1);
    window.addEventListener('scarlet-update', handler);
    return () => window.removeEventListener('scarlet-update', handler);
  }, []);

  const pinned = getPinned();
  if (!pinned.length) return (
    <div style={{ color: 'var(--text2)', fontSize: 13, padding: '8px 0' }}>
      No pinned foods yet — log a meal and it gets pinned automatically
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {pinned.map(food => (
        <div key={food.name} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 12px', backdropFilter: 'blur(10px)',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{food.name}</div>
            <div style={{ fontSize: 11, color: 'var(--neon)' }}>{food.calories} kcal</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn-solid"
              style={{ padding: '5px 10px', fontSize: 11 }}
              onClick={() => addMeal({ name: food.name, calories: food.calories, protein: food.protein || 0 })}
            >Log</button>
            <button
              onClick={() => removePinned(food.name)}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
