// ─── Dashboard auto-alerts panel ─────────────────────────────────────────────
// Live issues to action: overdue receivables/payables, on-account to settle,
// vouchers pending / unpostable, idle ledgers, masters missing credit terms.
import React from 'react';
import { useAlerts } from '../core/useAccounting';
import { clickable } from '../core/ux/clickable';

const DARK = '#0d1326', DIM = '#5a6691';
const SEV = {
  error: { bg: '#FCEBEB', bd: '#F7C1C1', fg: '#A32D2D', icon: '⛔' },
  warn:  { bg: '#FFF7E6', bd: '#F0C36D', fg: '#854F0B', icon: '⚠' },
  info:  { bg: '#EAF1FB', bd: '#cfe0f5', fg: '#185FA5', icon: 'ℹ' },
};

export function AlertsPanel({ branch, onGo, compact }) {
  const q = useAlerts(branch);
  const d = q.data || {};
  const alerts = d.alerts || [];
  const c = d.counts || { error: 0, warn: 0, info: 0 };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e9f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: alerts.length ? 10 : 0, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: DARK }}>🔔 Alerts &amp; Action Items</h3>
        <span style={{ display: 'inline-flex', gap: 6 }}>
          {c.error > 0 && <span style={{ ...chip(SEV.error) }}>{c.error} critical</span>}
          {c.warn > 0 && <span style={{ ...chip(SEV.warn) }}>{c.warn} warnings</span>}
          {c.info > 0 && <span style={{ ...chip(SEV.info) }}>{c.info} to review</span>}
        </span>
        {q.isFetching && <span style={{ fontSize: 10.5, color: DIM, marginLeft: 'auto' }}>refreshing…</span>}
      </div>

      {q.isLoading && <div style={{ fontSize: 12, color: DIM }}>Checking for issues…</div>}
      {!q.isLoading && !alerts.length && <div style={{ fontSize: 12.5, color: '#27500A', fontWeight: 600 }}>✓ All clear — no open issues.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
        {alerts.map((a, i) => {
          const s = SEV[a.severity] || SEV.info;
          return (
            <div key={i} {...(a.link && onGo ? clickable(() => onGo(a.link)) : {})} style={{ background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 8, padding: '8px 11px', cursor: a.link && onGo ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, color: s.fg, fontSize: 12.5 }}>
                <span>{s.icon}</span><span>{a.title}</span>
                {a.link && onGo && <span style={{ marginLeft: 'auto', fontSize: 11, color: s.fg }}>→</span>}
              </div>
              <div style={{ fontSize: 11.5, color: '#3a3f55', marginTop: 3 }}>{a.detail}</div>
              {a.sample && a.sample.length > 0 && <div style={{ fontSize: 10, color: DIM, marginTop: 3, fontStyle: 'italic' }}>{a.sample.slice(0, 6).join(', ')}{a.count > 6 ? ` +${a.count - 6} more` : ''}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const chip = (s) => ({ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.fg, border: `1px solid ${s.bd}` });
