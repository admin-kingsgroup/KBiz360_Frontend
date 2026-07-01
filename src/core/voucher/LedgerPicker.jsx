import React from 'react';
import { LedgerSelect } from '../helpers';
import { useLedgerRegistry } from '../useReference';

/**
 * Name-based wrapper around the id-based LedgerSelect.
 *
 * The unified voucher form keeps ledgers as NAMES in its state (that's what the
 * API stores and what the live preview expects), but LedgerSelect speaks ledger
 * IDs. This adapter maps name↔id against the live chart so create and edit can
 * share the exact same field state.
 *
 * If `value` is a legacy name not present in the current chart (imported / merged /
 * renamed ledger), the trigger shows the NAME itself flagged "not in chart" — never a
 * blank-looking field — so an edit/revoke reopen surfaces the stale ledger instead of
 * hiding it. The name stays in state; picking a new ledger overwrites it. The flag is
 * gated on the chart being loaded so valid ledgers don't flash it during load.
 */
export function LedgerPicker({ value, onChange, filter, placeholder, style, branch }) {
  const q = useLedgerRegistry(branch);
  const reg = q.data || [];
  const loaded = q.isSuccess && reg.length > 0;
  const idOf = (name) => reg.find((l) => l.name === name)?.id || '';
  const nameOf = (id) => reg.find((l) => l.id === id)?.name || '';
  return (
    <LedgerSelect
      branch={branch}
      value={idOf(value)}
      onChange={(id) => onChange(nameOf(id))}
      filter={filter}
      placeholder={placeholder || 'Select ledger...'}
      rawValue={loaded && value && !idOf(value) ? value : ''}
      style={style}
    />
  );
}
