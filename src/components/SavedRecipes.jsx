import { useEffect, useState } from 'react';
import { getRecipes, deleteRecipe, addMeal } from '../utils/storage';

export default function SavedRecipes() {
  const [, forceRender] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  function handleDelete(name) {
    if (confirmDelete === name) {
      deleteRecipe(name);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(name);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontWeight: 500 }}>
        saved recipes — tap to log
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {recipes.map(r => (
          <div key={r.name} style={{
            flexShrink: 0, position: 'relative',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', minWidth: 110,
            backdropFilter: 'blur(10px)',
          }}>
            {/* Tap area to log */}
            <button
              onClick={() => logRecipe(r)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 14px 10px 14px', textAlign: 'left', width: '100%',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,143,171,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ fontSize: 13, color: 'var(--neon)', fontWeight: 600, marginBottom: 3, whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.calories} kcal · {r.protein || 0}g protein</div>
            </button>

            {/* Delete button */}
            <button
              onClick={() => handleDelete(r.name)}
              style={{
                position: 'absolute', top: 5, right: 5,
                background: confirmDelete === r.name ? '#ff6b6b' : 'rgba(0,0,0,0.4)',
                border: 'none', borderRadius: '50%',
                width: 18, height: 18, fontSize: 10,
                color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              title={confirmDelete === r.name ? 'Tap again to confirm delete' : 'Delete recipe'}
            >{confirmDelete === r.name ? '✓' : '×'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
