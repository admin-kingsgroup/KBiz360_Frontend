import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function AlertStrip({ count, onClick }) {
  if (!count) return null;
  return (
    <div
      onClick={onClick}
      style={{
        marginBottom: 12,
        padding: '9px 16px',
        borderRadius: 9,
        background: '#FCEBEB',
        border: '1px solid #F7C1C1',
        fontSize: 11,
        color: '#A32D2D',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>
        <AlertTriangle size={14} style={{ marginRight: 6 }} />
        ⚠ {count} unmatched ticket{count !== 1 ? 's' : ''} — revenue at risk
      </span>
      <span style={{ fontSize: 10 }}>View →</span>
    </div>
  );
}
