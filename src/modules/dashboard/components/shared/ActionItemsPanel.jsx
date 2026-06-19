import React from 'react';
import { card } from '../../../../core/styles';
import { ACTION_COLORS, ACTION_BACKGROUNDS } from '../../utils/constants';

export function ActionItemsPanel({ items, onItemClick }) {
  return (
    <div style={{ ...card }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#0d1326' }}>⚡ Today&apos;s Action Items</p>
      {(!items || items.length === 0) && (
        <p style={{ margin: 0, padding: '8px 10px', fontSize: 10.5, color: '#5a6691' }}>Nothing needs attention right now.</p>
      )}
      {(items || []).map((a, i) => (
        <div
          key={i}
          onClick={() => a.route && onItemClick?.(a.route)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: ACTION_BACKGROUNDS[a.type],
            marginBottom: 6,
            cursor: a.route ? 'pointer' : 'default',
            border: a.urgent ? `1px solid ${ACTION_COLORS[a.type]}30` : 'none',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
          <span style={{ fontSize: 10.5, color: ACTION_COLORS[a.type], fontWeight: a.urgent ? 700 : 500, flex: 1 }}>
            {a.text}
          </span>
          {a.route && <span style={{ fontSize: 10, color: ACTION_COLORS[a.type], flexShrink: 0 }}>→</span>}
        </div>
      ))}
    </div>
  );
}
