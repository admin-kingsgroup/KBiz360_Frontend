import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverview } from './api/monitor';
import { overviewKpis, streamRows, actorName } from './utils/monitor';

// ─── TK GROUP · FE · Control Tower (container) ───────────────────────────────
// The "is the control layer healthy?" view: headline KPIs, pending split by stream,
// which controls are live, and the most recent control events. Read-only; polls
// gently. Dormant-safe — with nothing happening it just shows zeros.
const cardStyle = { background: '#fff', border: '1px solid #e3e6ec', borderRadius: 8, padding: '12px 14px' };
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const chip = (on) => ({ fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: on ? '#E6F2EC' : '#EEF0F3', color: on ? '#1F6E4C' : '#8892a4' });

export function ControlTower() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'overview'], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000 });
  const o = q.data || {};
  const controls = o.controls || [];
  const events = o.recentEvents || [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }} data-testid="tk-kpis">
        {overviewKpis(o).map((k) => (
          <div key={k.key} style={cardStyle}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2a44', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: '#5a6691' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        <section style={cardStyle}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 8px' }}>Pending by stream</h2>
          {streamRows(o).map((s) => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
              <span style={{ color: '#555' }}>{s.label}</span>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</b>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 8px' }}>Controls</h2>
          {controls.length ? controls.map((c) => (
            <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '3px 0' }}>
              <span style={{ color: '#555' }}>{c.label}</span>
              <span style={chip(c.enabled)}>{c.enabled ? 'ON' : 'off'}</span>
            </div>
          )) : <div style={{ fontSize: 12, color: '#777' }}>No controls configured.</div>}
        </section>
      </div>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 8px' }}>Recent control events</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Action', 'By', 'Branch'].map((h) => <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {events.length ? events.map((e, i) => (
              <tr key={i}>
                <td style={cell}>{e.action}</td>
                <td style={cell}>{actorName(e.actor)}</td>
                <td style={cell}>{e.branch || '—'}</td>
              </tr>
            )) : <tr><td style={{ ...cell, color: '#777' }} colSpan={3}>No control events yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
