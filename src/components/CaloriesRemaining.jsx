import { useState } from 'react';
import { getGoal, setGoal, getProteinGoal, setProteinGoal, getCaloriesConsumed, getCaloriesRemaining, getProteinConsumed, getStreak } from '../utils/storage';

export default function CaloriesRemaining({ onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [goalInput, setGoalInput] = useState(getGoal());
  const [proteinInput, setProteinInput] = useState(getProteinGoal());

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
    onUpdate?.();
  }

  return (
    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
      {/* Big calories remaining */}
      <div style={{ marginBottom: 4, fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2 }}>
        calories remaining
      </div>
      <div style={{
        fontSize: 72, fontFamily: 'Orbitron', fontWeight: 900,
        color: isOver ? '#ff4444' : 'var(--neon)',
        textShadow: isOver ? '0 0 20px #ff4444' : 'var(--glow)',
        lineHeight: 1, marginBottom: 4,
      }}>
        {Math.abs(remaining)}
      </div>
      {isOver && <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 4 }}>over goal</div>}

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, margin: '12px 0', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${pct}%`,
          background: isOver ? '#ff4444' : 'var(--neon)',
          boxShadow: isOver ? '0 0 8px #ff4444' : '0 0 8px var(--neon)',
          transition: 'width 0.5s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 16 }}>
        <span>{consumed} eaten</span>
        <span>goal: {goal}</span>
      </div>

      {/* Protein bar */}
      <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--text2)' }}>protein</span>
        <span style={{ color: 'var(--neon2)' }}>{protein}/{proteinGoal}g</span>
      </div>
      <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, width: `${proteinPct}%`,
          background: 'var(--neon2)', boxShadow: '0 0 6px var(--neon2)',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div style={{ fontSize: 11, color: 'var(--neon)', marginBottom: 12 }}>
          🔥 {streak} day streak
        </div>
      )}

      {/* Edit goals */}
      {editing ? (
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', width: 60 }}>kcal goal</label>
            <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11, color: 'var(--text2)', width: 60 }}>protein g</label>
            <input type="number" value={proteinInput} onChange={e => setProteinInput(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-solid" style={{ flex: 1, padding: '8px' }} onClick={saveGoals}>Save</button>
            <button className="btn-neon" style={{ flex: 1, padding: '8px' }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-neon" style={{ fontSize: 10, padding: '6px 12px' }} onClick={() => setEditing(true)}>
          set goals
        </button>
      )}
    </div>
  );
}
