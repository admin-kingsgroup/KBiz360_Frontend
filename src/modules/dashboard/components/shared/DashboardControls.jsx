import React from 'react';
import { BRANCHES } from '../../../../core/data';
import { rangeToDates } from '../../api/get-live-finance';

/**
 * Dashboard control bar — period mode + branch/group scope.
 *
 *   Period : This Month · This Quarter (current FY quarter) · YTD (FY-to-date) ·
 *            All (since inception)
 *   Scope  : Group Company (all branches) · any individual branch
 *
 * Both drive the LIVE double-entry queries (see dashboard.service). The little
 * note underneath spells out the exact window/scope being shown.
 */
const RANGE_TABS = [
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'All' },
];

export function DashboardControls({ range, setRange, scope, setScope }) {
  const dates = rangeToDates(range);
  const scopeLabel =
    scope === 'ALL'
      ? 'Group Company · all branches consolidated'
      : (() => { const b = BRANCHES.find((x) => x.code === scope); return b ? `${b.code} — ${b.city}` : scope; })();

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 14,
        padding: '10px 14px', background: '#f7f8fb', border: '1px solid #e1e3ec', borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Period segmented control */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: '#fff', borderRadius: 7, border: '1px solid #e1e3ec' }}>
          {RANGE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              style={{
                padding: '6px 14px', border: 'none', borderRadius: 5, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                background: range === t.id ? '#0d1326' : 'transparent',
                color: range === t.id ? '#d4a437' : '#5a6691',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Branch / Group scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8696a9', textTransform: 'uppercase', letterSpacing: 0.4 }}>Scope</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 600, color: '#0d1326', background: '#fff', border: '1px solid #e1e3ec', borderRadius: 6, cursor: 'pointer', minHeight: 32 }}
          >
            <option value="ALL">🌐 Group Company (All Branches)</option>
            {BRANCHES.map((b) => (
              <option key={b.code} value={b.code}>{b.flag} {b.code} — {b.city}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#5a6691' }}>
        Showing <strong style={{ color: '#0d1326' }}>{dates.label}</strong> · <strong style={{ color: '#0d1326' }}>{scopeLabel}</strong>
      </div>
    </div>
  );
}
