import React from 'react';
import { card } from '../../../../core/styles';
import { QUICK_CREATE_ACTIONS } from '../../utils/constants';

export function QuickCreateBar({ onNavigate }) {
  return (
    <div style={{ ...card, background: '#f9fafb' }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#0d1326' }}>⚡ Quick Create</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_CREATE_ACTIONS.map((q) => (
          <button
            key={q.route}
            onClick={() => onNavigate(q.route)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              background: '#fff',
              color: q.color,
              border: `1.5px solid ${q.color}30`,
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = q.color;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = q.color;
            }}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
