import React, { useEffect, useState, useCallback } from 'react';
import { getChangeRequests, actOnChangeRequest } from './api/changeRequests';
import { ChangeRequestList } from './ChangeRequestList';

// ─── TK GROUP · FE · approvals container ─────────────────────────────────────
// Wires the change-request list to the API: loads pending requests, and on an
// action confirms (approve) or collects a mandatory reason (reject), calls the
// API, then refreshes. Fails soft — an error is shown, the list stays usable.
export function ApprovalsInbox() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setItems(await getChangeRequests('pending')); }
    catch { setItems([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onAct = useCallback(async (id, action) => {
    setError('');
    let reason = '';
    if (action === 'reject') {
      reason = (typeof window !== 'undefined' && window.prompt) ? window.prompt('Reason for rejection:') : '';
      if (reason == null || !String(reason).trim()) return;          // cancelled / empty → abort (BE also enforces)
    } else if (typeof window !== 'undefined' && window.confirm && !window.confirm('Approve this change?')) {
      return;                                                         // approve cancelled
    }
    setBusy(true);
    try {
      await actOnChangeRequest(id, action, reason);
      await load();
    } catch (e) {
      setError((e && e.message) || 'Action failed');
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <div className="tk-approvals" aria-busy={busy}>
      {error ? <div className="tk-error" role="alert" style={{ color: '#A32F2F', fontSize: 12, padding: '6px 12px' }}>{error}</div> : null}
      <ChangeRequestList items={items} onAct={onAct} />
    </div>
  );
}
