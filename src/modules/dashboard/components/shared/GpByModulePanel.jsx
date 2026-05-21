import React from 'react';
import { card, btnGh } from '../../../../core/styles';
import { BAR_COLORS } from '../../utils/constants';
import { safeRatio } from '../../utils/helpers';

export function GpByModulePanel({ modGp, totalGp, formatMoney, onViewFullReport }) {
  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>📊 GP by Product — May 2026</p>
        <button onClick={onViewFullReport} style={{ ...btnGh, fontSize: 10, padding: '3px 10px' }}>
          Full Report →
        </button>
      </div>
      {modGp.length === 0 && <p style={{ margin: 0, color: '#5a6691', fontSize: 11 }}>No bookings this month</p>}
      {modGp.map((m, i) => {
        const pct = safeRatio(m.gp, totalGp);
        const barW = Math.max(3, pct);
        return (
          <div key={m.mod} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0d1326' }}>{m.mod}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 9.5, color: '#5a6691' }}>{m.cnt} bookings</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0d1326', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(m.gp)}
                </span>
                <span style={{ fontSize: 9.5, color: BAR_COLORS[i] || '#384677', fontWeight: 700, minWidth: 30, textAlign: 'right' }}>
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
            <div style={{ height: 6, background: '#f3f4f8', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: barW + '%',
                  background: BAR_COLORS[i] || '#384677',
                  borderRadius: 3,
                  transition: 'width 0.4s',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
