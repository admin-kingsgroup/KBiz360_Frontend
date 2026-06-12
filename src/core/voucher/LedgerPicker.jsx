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
 * If `value` is a legacy name not present in the current chart, the trigger
 * shows the placeholder but the name is preserved in state (we never silently
 * drop it) — picking a new ledger overwrites it.
 */
export function LedgerPicker({ value, onChange, filter, placeholder, style, branch }) {
  const reg = useLedgerRegistry(branch).data || [];
  const idOf = (name) => reg.find((l) => l.name === name)?.id || '';
  const nameOf = (id) => reg.find((l) => l.id === id)?.name || '';
  return (
    <LedgerSelect
      branch={branch}
      value={idOf(value)}
      onChange={(id) => onChange(nameOf(id))}
      filter={filter}
      placeholder={placeholder || (value && !idOf(value) ? value : 'Select ledger...')}
      style={style}
    />
  );
}
