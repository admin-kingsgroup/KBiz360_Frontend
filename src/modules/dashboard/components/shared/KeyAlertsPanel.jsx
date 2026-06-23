import React from 'react';

const SEVERITY_BORDER = { high: '#dc2626', med: '#d97706', low: '#c2a04a' };

export function KeyAlertsPanel({ alerts, onAlertClick }) {
  return (
    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
      {alerts.map((a, i) => (
        <div
          key={i}
          onClick={() => onAlertClick?.(a.route)}
          style={{
            padding: '8px 10px',
            marginBottom: 6,
            borderLeft: '3px solid ' + (SEVERITY_BORDER[a.severity] || '#c2a04a'),
            background: '#fafbfd',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: '#14161a', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#5b616e' }}>
            {a.type} · {a.date}
          </p>
        </div>
      ))}
    </div>
  );
}
