import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFlagState } from './api/flags';
import { getPendingByType } from './api/governance';
import { goLiveSteps, masterIsOn } from './utils/goLive';

// ─── TK GROUP · FE · Go-Live checklist (container) ───────────────────────────
// A guided view of exactly where go-live stands: is the control catalogue ready, has
// the master switch been proposed, approved, and engaged. Read-only status; the actual
// flip happens on Control Flags → Approvals (dual-approved, reversible).
const stepBox = (done) => ({
  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
  border: '1px solid #e3e6ec', borderRadius: 8, background: done ? '#F3FAF6' : '#fff',
});

export function GoLive({ setRoute }) {
  const fq = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 15_000 });
  const pq = useQuery({ queryKey: ['tk', 'pending', 'flag'], queryFn: () => getPendingByType('flag'), staleTime: 15_000 });
  const flagState = fq.data || { flags: {} };
  const pendingFlagCount = (pq.data || []).length;
  const on = masterIsOn(flagState);
  const steps = goLiveSteps(flagState, pendingFlagCount);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <div style={{ padding: '12px 16px', borderRadius: 8, background: on ? '#E6F2EC' : '#FBF6E9', border: `1px solid ${on ? '#bfe0cd' : '#efe2bd'}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: on ? '#1F6E4C' : '#6E5518' }} data-testid="tk-golive-status">
          {on ? 'LIVE — the control guard is engaged' : 'DORMANT — controls are built but not enforcing'}
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
          {on
            ? 'Enforcement is active. Toggle the master control off (dual-approved) to roll back.'
            : 'Nothing is enforced yet. Follow the steps below to go live — it stays fully reversible.'}
        </div>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {steps.map((s, i) => (
          <li key={s.key} style={stepBox(s.done)}>
            <span aria-hidden style={{ fontSize: 15, lineHeight: '20px' }}>{s.done ? '✅' : `${i + 1}.`}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1f2a44' }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: '#666', marginTop: 1 }}>{s.hint}</div>
            </div>
            {s.href && !s.done ? (
              <button type="button" onClick={() => setRoute && setRoute(s.href)} style={{ alignSelf: 'center', background: '#0d1326', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Open
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
