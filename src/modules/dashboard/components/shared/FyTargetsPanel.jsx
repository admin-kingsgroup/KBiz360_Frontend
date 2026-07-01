import React from 'react';
import { safeRatio } from '../../utils/helpers';

// Word + colour so "how am I tracking" reads without relying on the bar colour.
const bandColor = (pct) => (pct >= 90 ? '#16a34a' : pct >= 70 ? '#c2a04a' : '#dc2626');
const bandLabel = (pct) => (pct >= 90 ? 'On track' : pct >= 70 ? 'At risk' : 'Behind');

// `formatMoney` is the branch-aware money formatter (compactAmt) the dashboards already
// build (e.g. $ for Africa, ₹/Cr-L for India). When provided, amounts use it so a USD
// target reads "$5.0M", not the old ₹-only "÷100000 + L" which mis-scaled USD as "$5L".
// `t.unit` is kept only as a legacy fallback when no formatter is passed.
export function FyTargetsPanel({ targets, formatMoney }) {
  const fmt = (n) => (formatMoney ? formatMoney(n) : `${targets[0]?.unit || ''}${(n / (targets[0]?.unit ? 100000 : 1)).toFixed(0)}${targets[0]?.unit ? 'L' : ''}`);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {targets.map((t) => {
        const pct = Math.min(100, safeRatio(t.actual, t.target));
        return (
          <div key={t.metric}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11.5, color: '#14161a', fontWeight: 600 }}>{t.metric}</span>
              <span style={{ fontSize: 11, color: '#5b616e' }}>
                <span style={{ color: bandColor(pct), fontWeight: 700 }}>{bandLabel(pct)}</span> · {Math.round(pct)}%
              </span>
            </div>
            <div style={{ height: 8, background: '#f0f2f7', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: pct + '%',
                  background: bandColor(pct),
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: '#5b616e', fontFamily: 'monospace' }}>
                {fmt(t.actual)}
              </span>
              <span style={{ fontSize: 10, color: '#5b616e', fontFamily: 'monospace' }}>
                / {fmt(t.target)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
