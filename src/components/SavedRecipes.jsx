import { useEffect, useState } from 'react';
import { getRecipes, deleteRecipe, addMeal } from '../utils/storage';

export default function SavedRecipes() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const handler = () => forceRender(n => n + 1);
    window.addEventListener('scarlet-update', handler);
    return () => window.removeEventListener('scarlet-update', handler);
  }, []);

  const recipes = getRecipes();
  if (!recipes.length) return null;

  function logRecipe(recipe) {
    addMeal({ name: recipe.name, calories: recipe.calories, protein: recipe.protein || 0 });
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 500 }}>
        saved recipes
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {recipes.map(r => (
          <button
            key={r.name}
            onClick={() => logRecipe(r)}
            style={{
              flexShrink: 0,
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
              minWidth: 110,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--neon)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(255,143,171,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--neon)', fontWeight: 600, marginBottom: 3, whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.calories} kcal · {r.protein || 0}g</div>
          </button>
        ))}
      </div>
    </div>
  );
}
