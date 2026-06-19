import React from 'react';
import { safeRatio } from '../../utils/helpers';

export function FyTargetsPanel({ targets }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {targets.map((t) => {
        const pct = Math.min(100, safeRatio(t.actual, t.target));
        return (
          <div key={t.metric}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11.5, color: '#0d1326', fontWeight: 600 }}>{t.metric}</span>
              <span style={{ fontSize: 11, color: '#5a6691' }}>{Math.round(pct)}%</span>
            </div>
            <div style={{ height: 8, background: '#f0f2f7', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: pct + '%',
                  background: pct >= 90 ? '#22c55e' : pct >= 70 ? '#d4a437' : '#A32D2D',
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: '#5a6691', fontFamily: 'monospace' }}>
                {t.unit}
                {(t.actual / (t.unit ? 100000 : 1)).toFixed(0)}
                {t.unit ? 'L' : ''}
              </span>
              <span style={{ fontSize: 10, color: '#5a6691', fontFamily: 'monospace' }}>
                / {t.unit}
                {(t.target / (t.unit ? 100000 : 1)).toFixed(0)}
                {t.unit ? 'L' : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
