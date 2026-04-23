import { getWeeklyMeals, getGoal, getStreak } from '../utils/storage';

export default function WeeklyReport() {
  const days = getWeeklyMeals();
  const goal = getGoal();
  const streak = getStreak();
  const hitDays = days.filter(d => d.calories > 0 && d.calories <= goal).length;
  const avgCals = Math.round(days.reduce((s, d) => s + d.calories, 0) / days.filter(d => d.calories > 0).length) || 0;

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxCals = Math.max(...days.map(d => d.calories), goal);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="card" style={{ flex: 1, padding: 12, textAlign: 'center', marginRight: 8 }}>
          <div style={{ fontSize: 28, fontFamily: 'Orbitron', color: 'var(--neon)' }}>{hitDays}/7</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>goals hit</div>
        </div>
        <div className="card" style={{ flex: 1, padding: 12, textAlign: 'center', marginRight: 8 }}>
          <div style={{ fontSize: 28, fontFamily: 'Orbitron', color: 'var(--neon2)' }}>{avgCals}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>avg kcal</div>
        </div>
        <div className="card" style={{ flex: 1, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontFamily: 'Orbitron', color: 'var(--neon)' }}>{streak}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>day streak</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          7-day calories
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
          {days.map((d, i) => {
            const date = new Date(d.date + 'T12:00:00');
            const label = DAY_LABELS[date.getDay()];
            const pct = maxCals > 0 ? (d.calories / maxCals) * 100 : 0;
            const isToday = d.date === new Date().toISOString().split('T')[0];
            const hit = d.calories > 0 && d.calories <= goal;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${pct}%`, minHeight: d.calories > 0 ? 4 : 0,
                  background: hit ? 'var(--neon)' : d.calories > goal ? '#ff4444' : 'var(--bg3)',
                  borderRadius: 2,
                  boxShadow: hit ? '0 0 6px var(--neon)' : 'none',
                  border: isToday ? '1px solid var(--neon2)' : '1px solid transparent',
                  transition: 'height 0.5s ease', alignSelf: 'flex-end',
                }} />
                <div style={{ fontSize: 9, color: isToday ? 'var(--neon2)' : 'var(--text2)' }}>{label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <div style={{ borderTop: '1px dashed var(--border)', flex: 1, marginTop: 4 }} />
          <span style={{ fontSize: 9, color: 'var(--text2)', marginLeft: 4 }}>goal</span>
        </div>
      </div>
    </div>
  );
}
