// ─── TK GROUP · FE · configuration readiness (pure) ──────────────────────────
// The "how much of the control layer is engaged" scoreboard Faiz & the Owner watch
// toward go-live — distinct from the Go-Live checklist (the 4-step master-guard flip).
// Computes a green % + per-control status from the REAL flag state (/api/tk/flags).
// Read-only; pure & testable.

/** @param {{flags?:Object<string,{enabled?:boolean,foundation?:boolean,label?:string}>}} flagState */
export function readinessFromFlags(flagState) {
  const flags = (flagState && flagState.flags) || {};
  const items = Object.keys(flags).map((k) => {
    const f = flags[k] || {};
    const on = f.foundation === true || f.enabled === true;
    return { key: k, label: f.label || k, on, foundation: f.foundation === true };
  }).sort((a, b) => a.key.localeCompare(b.key));
  const total = items.length;
  const engaged = items.filter((i) => i.on).length;
  const pct = total ? Math.round((engaged / total) * 100) : 0;
  const masterOn = items.some((i) => i.key === 'core.policy_guard' && i.on);
  return { total, engaged, pct, masterOn, items };
}
