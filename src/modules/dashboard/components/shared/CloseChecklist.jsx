import React from 'react';
import { MONTH_CLOSE_CHECKLIST } from '../../utils/constants';
import { useAlerts } from '../../../../core/useAccounting';
import { setNavFocus } from '../../../../core/ux/navFocus';

/**
 * Month-end close checklist. Gated by live critical alerts: while any 🔴 alert is
 * open (pending or snoozed) for the branch, the period cannot be marked closed —
 * each blocker links to its fix screen. The gate is advisory (UI-level): there is
 * no backend period-lock yet, so it surfaces and blocks the action, it does not
 * prevent posting into the period.
 */
export function CloseChecklist({ items = MONTH_CLOSE_CHECKLIST, defaultCheckedThrough = 5, branch, onGo }) {
  const q = useAlerts(branch);
  const blockers = (q.data?.alerts || []).filter((a) => a.severity === 'error' && (a.status || 'pending') !== 'finished');
  const blocked = blockers.length > 0;

  return (
    <>
      {blocked ? (
        <div style={{ border: '1px solid #F7C1C1', background: '#FCEBEB', borderRadius: 8, padding: '9px 11px', marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#A32D2D', marginBottom: 6 }}>🔒 Close blocked — {blockers.length} critical issue{blockers.length > 1 ? 's' : ''} must be cleared</div>
          {blockers.map((a) => (
            <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: '#0d1326' }}>• {a.title}</span>
              {a.link && onGo && <button onClick={() => { const r = typeof a.link === 'string' ? a.link : a.link.route; setNavFocus(r, a.focus || { kind: a.type, sample: a.sample }); onGo(r); }} style={{ border: 'none', background: 'transparent', color: '#185FA5', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Fix →</button>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#27500A', marginBottom: 8 }}>✓ No critical issues — period is ready to close.</div>
      )}

      {items.map((item, i) => (
        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
          <input type="checkbox" defaultChecked={i < defaultCheckedThrough} style={{ cursor: 'pointer' }} />
          <span style={{ fontSize: 11.5, color: '#0d1326' }}>{item}</span>
        </div>
      ))}

      <button disabled={blocked} title={blocked ? 'Clear critical alerts first' : 'Mark this period closed'} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 700, cursor: blocked ? 'not-allowed' : 'pointer', background: blocked ? '#bfc3d6' : '#27500A', color: '#fff', opacity: blocked ? 0.7 : 1 }}>
        {blocked ? '🔒 Close blocked' : 'Mark Period Closed'}
      </button>
    </>
  );
}
