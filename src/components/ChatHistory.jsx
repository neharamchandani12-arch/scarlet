import { useEffect, useRef } from 'react';

export default function ChatHistory({ messages, typing }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  return (
    <div style={{
      flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      gap: 12, padding: '12px 0',
    }}>
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, marginTop: 20 }}>
          <div style={{ marginBottom: 16, color: 'var(--neon)', fontSize: 13 }}>Try asking:</div>
          {[
            'How many calories in 2 eggs?',
            'What should I eat for dinner?',
            'How am I doing on protein?',
            'Save my breakfast as Morning Stack',
          ].map(s => (
            <div key={s} style={{
              padding: '6px 12px', margin: '4px auto',
              border: '1px solid var(--border)', borderRadius: 4,
              maxWidth: 260, fontSize: 11, cursor: 'default',
            }}>{s}</div>
          ))}
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} className="fade-in" style={{
          display: 'flex',
          flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          gap: 8, alignItems: 'flex-end',
        }}>
          {msg.role === 'assistant' && (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'var(--neon)', flexShrink: 0,
            }}>S</div>
          )}
          <div style={{
            maxWidth: '75%', padding: '10px 14px', borderRadius: 8,
            background: msg.role === 'user' ? 'var(--neon)' : 'var(--bg3)',
            color: msg.role === 'user' ? 'var(--bg)' : 'var(--text)',
            border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
            fontSize: 13, lineHeight: 1.5,
            boxShadow: msg.role === 'user' ? '0 0 10px rgba(255,45,120,0.3)' : 'none',
          }}>
            {msg.displayText || msg.content}
            {msg.foodData && (
              <div style={{
                marginTop: 8, padding: 8, background: 'var(--bg2)',
                borderRadius: 4, border: '1px solid var(--border)',
                fontSize: 12,
              }}>
                <div style={{ color: 'var(--neon)', fontWeight: 'bold', marginBottom: 4 }}>{msg.foodData.name}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span>🔥 {msg.foodData.calories} kcal</span>
                  <span style={{ color: 'var(--neon2)' }}>💪 {msg.foodData.protein}g protein</span>
                </div>
                {msg.foodData.logged && (
                  <div style={{ color: 'var(--neon)', fontSize: 11, marginTop: 4 }}>✓ logged</div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {typing && (
        <div className="fade-in" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--neon)', flexShrink: 0,
          }}>S</div>
          <div style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
