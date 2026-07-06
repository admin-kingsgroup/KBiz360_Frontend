import React, { useCallback, useEffect, useState } from 'react';
import { getPeriodLocks, proposePeriodLock } from './api/periodLocks';
import { lockRows } from './utils/periodLocks';
import { PeriodLockPanel } from './PeriodLockPanel';

// ─── TK GROUP · FE · period-lock admin (container) ───────────────────────────
// Shows the current locks and lets a central role PROPOSE a lock/unlock — which is
// filed as a Farhan + Owner change-request, never applied directly. 'ALL' = a
// group-wide lock across all branches. Branch list is injected (default = the six
// live branches) so the container stays decoupled from the reference cache.
const DEFAULT_BRANCHES = ['ALL', 'BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];

export function PeriodLockAdmin({ branches = DEFAULT_BRANCHES }) {
  const [state, setState] = useState({ items: [] });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setState(await getPeriodLocks() || { items: [] }); }
    catch { setState({ items: [] }); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onPropose = useCallback(async (form) => {
    setMsg('');
    try {
      await proposePeriodLock(form);
      setMsg(`Period lock for ${form.branch} ${form.period} submitted for Owner approval.`);
    } catch (e) {
      setMsg((e && e.message) || 'Failed to submit the period lock.');
    }
  }, []);

  return (
    <div className="tk-period-locks">
      {msg ? <div role="status" className="mb-2.5 rounded-md bg-warning-soft px-3 py-1.5 text-xs text-warning">{msg}</div> : null}
      <PeriodLockPanel rows={lockRows(state)} branches={branches} onPropose={onPropose} />
    </div>
  );
}
