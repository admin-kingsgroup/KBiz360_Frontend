import React from 'react';
import { card } from '../../../../core/styles';
import { useMobile } from '../../../../core/hooks';

export function KpiTile({ label, value, growth, sub, color, bg, icon, onClick }) {
  const mob = useMobile();
  return (
    <div
      onClick={onClick}
      style={{
        ...card,
        borderTop: `4px solid ${color}`,
        padding: '14px 16px',
        background: bg || '#fff',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s,box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </p>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <p style={{ margin: 0, fontSize: mob ? 20 : 24, fontWeight: 800, color: '#0d1326', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {(growth != null || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {growth != null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: growth >= 0 ? '#27500A' : '#A32D2D',
                background: growth >= 0 ? '#EAF3DE' : '#FCEBEB',
                padding: '1px 7px',
                borderRadius: 999,
              }}
            >
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% vs Apr
            </span>
          )}
          {sub && <span style={{ fontSize: 9.5, color: '#5a6691' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}
