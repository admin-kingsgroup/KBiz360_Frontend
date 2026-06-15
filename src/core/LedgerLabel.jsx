// ─── Ledger provenance / lock badge ───────────────────────────────────────────
// One shared label so the ERP / BU / MN source tag + 🔒 lock show identically
// everywhere a ledger appears (Masters, Chart of Accounts, Balance Sheet, P&L,
// Trial Balance, registers, pickers). ERP is muted (the expected default); MN and
// BU are BOLD + coloured so manually-created / bulk-uploaded ledgers pop out.
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

// internal source → display tag
const BADGE = {
  system: { txt: 'ERP', bold: false, fg: '#5a6691', bg: 'transparent' },
  auto:   { txt: 'ERP', bold: false, fg: '#5a6691', bg: 'transparent' },
  import: { txt: 'BU',  bold: true,  fg: '#A32D2D', bg: '#FBE9E9' },   // bulk upload — red, bold
  manual: { txt: 'MN',  bold: true,  fg: '#854F0B', bg: '#FAEEDA' },   // manual     — amber, bold
};

export function SourceBadge({ source, compact = false }) {
  const b = BADGE[source] || BADGE.manual;
  return (
    <span title={`Source: ${b.txt === 'ERP' ? 'ERP-generated' : b.txt === 'BU' ? 'Bulk-uploaded' : 'Manually created'}`}
      style={{ fontSize: compact ? 8.5 : 9, fontWeight: b.bold ? 800 : 600, color: b.fg, background: b.bg,
        padding: b.bg === 'transparent' ? 0 : '1px 4px', borderRadius: 4, marginLeft: 5, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      {b.txt}
    </span>
  );
}

// Renders: <name> 🔒 <SourceBadge>. Pass source/locked when you have them (e.g.
// from a ledger row); for report rows that only carry a name, omit them and pass
// `meta` from useLedgerMeta() to resolve by name.
export function LedgerLabel({ name, source, locked, meta, compact = false, style }) {
  const m = (source === undefined && meta) ? meta(name) : { source, locked };
  return (
    <span style={style}>
      {name}
      {m && m.locked && <span title="Locked — super-admin only" style={{ marginLeft: 4, fontSize: compact ? 9 : 10 }}>🔒</span>}
      {m && m.source && <SourceBadge source={m.source} compact={compact} />}
    </span>
  );
}

// Lookup of ledger NAME → { source, locked } from the live chart, for report
// screens (BS / P&L / Trial Balance) that render leaf rows by name only.
export function useLedgerMeta() {
  const { data = [] } = useQuery({
    queryKey: ['ledgers', 'meta'],
    queryFn: () => apiGet('/api/ledgers'),
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  });
  return useMemo(() => {
    const map = new Map();
    for (const l of data || []) map.set(String(l.name || '').toLowerCase(), { source: l.source, locked: l.locked });
    return (name) => map.get(String(name || '').toLowerCase()) || null;
  }, [data]);
}
