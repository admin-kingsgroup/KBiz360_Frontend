import React from 'react';

// ─── TK GROUP · FE · partial-load notice ─────────────────────────────────────
// Shown above a branchwise table when SOME (not all) branches failed to load: the
// failed branches are dropped from the table so no fake ₹0 row masquerades as real
// data, and this strip names them + offers a retry. When EVERY branch is dropped the
// dashboard shows its whole-table error state instead — so this hides itself on
// `load.allFailed` (otherwise it would double up with the table error and wrongly
// promise "showing the rest" when nothing loaded). Takes the whole `load` object
// (from branchLoadState) so that rule lives in one place, not in each host.
export function BranchLoadNotice({ load, onRetry }) {
  const codes = (load && !load.allFailed && load.failedCodes) || [];
  if (!codes.length) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-warning bg-warning-soft px-3 py-2 text-xs text-warning">
      <span>⚠ Couldn’t load {codes.length} branch{codes.length > 1 ? 'es' : ''}: <b>{codes.join(', ')}</b> — showing the rest.</span>
      {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button>}
    </div>
  );
}

export default BranchLoadNotice;
