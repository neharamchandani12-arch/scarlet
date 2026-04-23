import { useState, useEffect } from 'react';
import { getGoal, setGoal, getProteinGoal, setProteinGoal, getCaloriesConsumed, getCaloriesRemaining, getProteinConsumed, getStreak } from '../utils/storage';

export default function CaloriesRemaining() {
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(getGoal());
  const [proteinInput, setProteinInput] = useState(getProteinGoal());
  const [, forceRender] = useState(0);

  // Re-render whenever any meal is logged
  useEffect(() => {
    const handler = () => forceRender(n => n + 1);
    window.addEventListener('scarlet-update', handler);
    return () => window.removeEventListener('scarlet-update', handler);
  }, []);

  const remaining = getCaloriesRemaining();
  const consumed = getCaloriesConsumed();
  const goal = getGoal();
  const protein = getProteinConsumed();
  const proteinGoal = getProteinGoal();
  const streak = getStreak();
  const pct = Math.min((consumed / goal) * 100, 100);
  const proteinPct = Math.min((protein / proteinGoal) * 100, 100);
  const isOver = remaining < 0;

  function saveGoals() {
    setGoal(goalInput);
    setProteinGoal(proteinInput);
    setEditing(false);
  }

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      {/* Big calories remaining */}
      <div style={{ marginBottom: 2, fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 500 }}>
        calories remaining
      </div>
      <div style={{
        fontSize: 64, fontFamily: 'Orbitron', fontWeight: 900, lineHeight: 1,
        marginBottom: 2,
        background: isOver
          ? 'linear-gradient(135deg, #ff6b6b, #ff4444)'
          : 'linear-gradient(135deg, var(--neon), var(--neon2))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        transition: 'all 0.4s ease',
      }}>
        {Math.abs(remaining)}
      </div>
      {isOver && <div style={{ color: '#ff6b6b', fontSize: 11, marginBottom: 4 }}>over goal</div>}

      {/* Calorie progress bar */}
      <div className="progress-bar" style={{ marginTop: 10, marginBottom: 6 }}>
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: isOver
            ? 'linear-gradient(90deg, #ff6b6b, #ff4444)'
            : 'linear-gradient(90deg, var(--neon), var(--neon2))',
          boxShadow: isOver ? '0 0 8px rgba(255,107,107,0.6)' : '0 0 10px rgba(255,143,171,0.5)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 12 }}>
        <span>{consumed} eaten</span>
        <span>goal {goal}</span>
      </div>

      {/* Protein bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: 'var(--text2)' }}>protein</span>
        <span style={{ color: 'var(--neon2)', fontWeight: 500 }}>{protein}/{proteinGoal}g</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div className="progress-fill" style={{
          width: `${proteinPct}%`,
          background: 'linear-gradient(90deg, var(--neon2), var(--neon3))',
          boxShadow: '0 0 8px rgba(233,196,106,0.5)',
        }} />
      </div>

      {streak > 0 && (
        <div style={{ fontSize: 12, color: 'var(--neon2)', marginBottom: 12, fontWeight: 500 }}>
          🔥 {streak} day streak
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', width: 64, flexShrink: 0 }}>kcal goal</label>
            <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', width: 64, flexShrink: 0 }}>protein g</label>
            <input type="number" value={proteinInput} onChange={e => setProteinInput(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-solid" style={{ flex: 1, padding: '8px' }} onClick={saveGoals}>Save</button>
            <button className="btn-neon" style={{ flex: 1, padding: '8px' }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-neon" style={{ fontSize: 10, padding: '6px 14px', width: '100%' }} onClick={() => setEditing(true)}>
          set goals
        </button>
      )}
    </div>
  );
}
