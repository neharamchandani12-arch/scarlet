import { useEffect, useState } from 'react';
import { getMeals, removeMeal } from '../utils/storage';

export default function MealLog() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handler = () => forceRender(n => n + 1);
    window.addEventListener('scarlet-update', handler);
    return () => window.removeEventListener('scarlet-update', handler);
  }, []);

  const meals = getMeals();

  if (!meals.length) return (
    <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13, padding: '24px 0' }}>
      Nothing logged yet today
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {meals.map(meal => (
        <div key={meal.id} className="card slide-up" style={{
          padding: '12px 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 3, fontWeight: 500 }}>{meal.name}</div>
            <div style={{ fontSize: 12, display: 'flex', gap: 14 }}>
              <span style={{ color: 'var(--neon)' }}>{meal.calories} kcal</span>
              {meal.protein > 0 && <span style={{ color: 'var(--neon2)' }}>{meal.protein}g protein</span>}
            </div>
          </div>
          <button
            onClick={() => removeMeal(meal.id)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text2)', fontSize: 18,
              padding: '4px 8px', lineHeight: 1, borderRadius: 6,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.target.style.color = '#ff6b6b'}
            onMouseLeave={e => e.target.style.color = 'var(--text2)'}
          >×</button>
        </div>
      ))}
    </div>
  );
}
