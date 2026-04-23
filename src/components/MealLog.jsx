import { getMeals, removeMeal } from '../utils/storage';

export default function MealLog({ onUpdate }) {
  const meals = getMeals();

  if (!meals.length) return (
    <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, padding: 20 }}>
      No meals logged today
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {meals.map(meal => (
        <div key={meal.id} className="card slide-up" style={{
          padding: '10px 14px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{meal.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--neon)' }}>🔥 {meal.calories} kcal</span>
              {meal.protein > 0 && <span style={{ color: 'var(--neon2)' }}>💪 {meal.protein}g</span>}
            </div>
          </div>
          <button
            onClick={() => { removeMeal(meal.id); onUpdate?.(); }}
            style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 16, padding: 4, lineHeight: 1 }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
