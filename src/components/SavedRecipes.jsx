import { getRecipes, deleteRecipe, addMeal } from '../utils/storage';

export default function SavedRecipes({ onUpdate }) {
  const recipes = getRecipes();

  if (!recipes.length) return null;

  function logRecipe(recipe) {
    addMeal({ name: recipe.name, calories: recipe.calories, protein: recipe.protein || 0 });
    onUpdate?.();
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
        saved recipes
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {recipes.map(r => (
          <div key={r.name} style={{
            flexShrink: 0, padding: '10px 14px',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 6, minWidth: 120,
          }}>
            <div style={{ fontSize: 12, color: 'var(--neon)', marginBottom: 2, whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 8 }}>{r.calories} kcal · {r.protein || 0}g protein</div>
            <button className="btn-solid" style={{ width: '100%', padding: '6px', fontSize: 11 }} onClick={() => logRecipe(r)}>
              Log
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
