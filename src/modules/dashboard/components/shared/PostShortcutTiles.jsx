import React from 'react';
import { POST_SHORTCUTS } from '../../utils/constants';

export function PostShortcutTiles({ onNavigate }) {
  return (
    <div className="mb-3.5 grid grid-cols-2 gap-3 tablet:grid-cols-4">
      {POST_SHORTCUTS.map((b) => (
        <button
          key={b.label}
          onClick={() => onNavigate(b.route)}
          className="min-h-[44px]"
          style={{
            padding: '18px 14px',
            background: '#fff',
            border: '2px solid ' + b.color,
            borderRadius: 10,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontWeight: 700,
            color: b.color,
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ fontSize: 28 }}>{b.icon}</span>
          <span>Post {b.label}</span>
        </button>
      ))}
    </div>
  );
}
