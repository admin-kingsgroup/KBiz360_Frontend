import React from 'react';

const SEVERITY_BORDER = { high: '#A32D2D', med: '#f97316', low: '#d4a437' };

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
            borderLeft: '3px solid ' + (SEVERITY_BORDER[a.severity] || '#d4a437'),
            background: '#fafbfd',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: '#0d1326', fontWeight: 600, lineHeight: 1.3 }}>{a.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#5a6691' }}>
            {a.type} · {a.date}
          </p>
        </div>
      ))}
    </div>
  );
}
