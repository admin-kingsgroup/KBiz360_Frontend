import React from 'react';
import { card, btnGh } from '../../../../core/styles';
import { MEDALS } from '../../utils/constants';
import { safeRatio } from '../../utils/helpers';

export function ConsultantLeaderboard({ consultants, formatMoney, onViewAll }) {
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>🏆 Consultant Leaderboard — This Month</p>
        <button onClick={onViewAll} style={{ ...btnGh, fontSize: 10, padding: '3px 10px' }}>
          Full →
        </button>
      </div>
      {consultants.length === 0 && <p style={{ margin: 0, color: '#5a6691', fontSize: 11 }}>No data</p>}
      {consultants.map((c, i) => {
        const gpPctC = safeRatio(c.gp, c.rev);
        return (
          <div
            key={c.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 0',
              borderBottom: i < consultants.length - 1 ? '1px solid #f3f4f8' : 'none',
            }}
          >
            <span style={{ fontSize: 16, width: 24 }}>{MEDALS[i] || String(i + 1)}</span>
            <span style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: '#0d1326' }}>{c.name}</span>
            <span style={{ fontSize: 10.5, color: '#5a6691' }}>{c.cnt} bkgs</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#27500A',
                minWidth: 70,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMoney(c.gp)}
            </span>
            <span
              style={{
                fontSize: 9.5,
                padding: '1px 7px',
                borderRadius: 999,
                background: '#EAF3DE',
                color: '#27500A',
                fontWeight: 700,
                minWidth: 42,
                textAlign: 'right',
              }}
            >
              {gpPctC}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
