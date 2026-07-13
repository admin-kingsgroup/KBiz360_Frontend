import React, { useEffect, useState, useCallback } from 'react';
import { getFlagState, proposeFlags } from '../api/flags';
import { flagRows, withToggled } from '../utils/flags';
import { FlagPanel } from '../FlagPanel';

// ─── TK GROUP · FE · control-flag admin (container) ──────────────────────────
// Shows the current control flags. Toggling one SUBMITS a change-request (Owner-only)
// rather than flipping it — so even go-live (turning controls on) is an Owner-approved,
// audited action, not a raw switch.
export function FlagAdmin() {
  const [state, setState] = useState({ flags: {} });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setState(await getFlagState() || { flags: {} }); }
    catch { setState({ flags: {} }); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onToggle = useCallback(async (key) => {
    setMsg('');
    const next = withToggled(state, key);
    try {
      await proposeFlags(next);
      setMsg(`Change to "${key}" submitted for Owner approval.`);
    } catch (e) {
      setMsg((e && e.message) || 'Failed to submit change.');
    }
  }, [state]);

  return (
    <div className="tk-flags grid gap-2">
      {msg ? <div role="status" className="rounded-md bg-warning-soft px-3 py-1.5 text-xs text-warning">{msg}</div> : null}
      <FlagPanel rows={flagRows(state)} onToggle={onToggle} />
    </div>
  );
}
