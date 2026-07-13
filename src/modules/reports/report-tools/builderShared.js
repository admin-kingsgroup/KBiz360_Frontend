/* ════════════════════════════════════════════════════════════════════
   reports/builderShared — shared bits for the Report Tools trio
   (Custom Report Builder · Saved Report Views · Scheduled Email Reports)
   ════════════════════════════════════════════════════════════════════
   • the source / groupBy / column catalogs — these MUST mirror the backend
     run engine's row shapes (kbiz360-erp-backend …/report-views/reportViews.run.js)
   • a fire-and-forget "pending builder config" stash so Saved Views can open
     the builder preloaded (mirrors core/registerNav's pendingSearch pattern)
   • the current login email (saved-view ownership)
   ──────────────────────────────────────────────────────────────────── */

export const RUN_SOURCES = [
  { key: 'vouchers', label: 'Vouchers — posted voucher headers' },
  { key: 'journals', label: 'Journal postings — double-entry lines' },
  { key: 'gp-bills', label: 'GP bills — per-file gross profit' },
];

// groupBy choices per source ('' = detail rows). ledger/group live on the
// journal postings, so they are journals-only (the engine 400s otherwise).
export const GROUP_OPTIONS = {
  vouchers: ['', 'party', 'branch', 'month', 'category', 'costCenter'],
  journals: ['', 'ledger', 'group', 'party', 'branch', 'month', 'category', 'costCenter'],
  'gp-bills': ['', 'party', 'branch', 'month', 'category'],
};

export const GROUP_LABEL = {
  '': 'None — detail rows', ledger: 'Ledger', group: 'Account group', party: 'Party',
  branch: 'Branch', month: 'Month', category: 'Category', costCenter: 'Cost centre',
};

// Column catalogs per source — `detail` for groupBy '' (row-level), `grouped`
// for any groupBy (the group-key column is implicit and always returned).
export const COLUMN_CATALOG = {
  vouchers: {
    detail: [
      { key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' }, { key: 'branch', label: 'Branch' }, { key: 'party', label: 'Party' },
      { key: 'costCenter', label: 'Cost Centre' }, { key: 'linkNo', label: 'Link No' },
      { key: 'subtotal', label: 'Taxable Value', num: true }, { key: 'taxAmt', label: 'Tax', num: true },
      { key: 'total', label: 'Total', num: true }, { key: 'status', label: 'Status' },
    ],
    grouped: [
      { key: 'subtotal', label: 'Taxable Value', num: true }, { key: 'taxAmt', label: 'Tax', num: true },
      { key: 'total', label: 'Total', num: true }, { key: 'count', label: 'Vouchers', num: true },
    ],
  },
  journals: {
    detail: [
      { key: 'date', label: 'Date' }, { key: 'vno', label: 'Voucher No' }, { key: 'branch', label: 'Branch' },
      { key: 'category', label: 'Category' }, { key: 'type', label: 'Type' }, { key: 'party', label: 'Party' },
      { key: 'costCenter', label: 'Cost Centre' }, { key: 'ledger', label: 'Ledger' }, { key: 'group', label: 'Group' },
      { key: 'debit', label: 'Debit', num: true }, { key: 'credit', label: 'Credit', num: true },
    ],
    grouped: [
      { key: 'debit', label: 'Debit', num: true }, { key: 'credit', label: 'Credit', num: true },
      { key: 'net', label: 'Net (Dr − Cr)', num: true }, { key: 'count', label: 'Lines', num: true },
    ],
  },
  'gp-bills': {
    detail: [
      { key: 'id', label: 'File / Link No' }, { key: 'date', label: 'Date' }, { key: 'branch', label: 'Branch' },
      { key: 'mod', label: 'Module' }, { key: 'client', label: 'Client' }, { key: 'supplier', label: 'Supplier' },
      { key: 'consultant', label: 'Consultant' },
      { key: 'sell', label: 'Revenue', num: true }, { key: 'cost', label: 'Cost', num: true }, { key: 'gp', label: 'Gross Profit', num: true },
    ],
    grouped: [
      { key: 'sell', label: 'Revenue', num: true }, { key: 'cost', label: 'Cost', num: true },
      { key: 'gp', label: 'Gross Profit', num: true }, { key: 'files', label: 'Files', num: true },
    ],
  },
};

export function catalogFor(source, groupBy) {
  const cat = COLUMN_CATALOG[source] || COLUMN_CATALOG.vouchers;
  return groupBy ? cat.grouped : cat.detail;
}

/* ── pending builder config (Saved Views → Builder hand-off) ─────────────── */
let pendingBuilderConfig = null;
export function stashBuilderConfig(cfg) { pendingBuilderConfig = cfg || null; }
export function consumeBuilderConfig() { const c = pendingBuilderConfig; pendingBuilderConfig = null; return c; }

/* ── current login (saved-view ownership) ────────────────────────────────── */
export function currentUserEmail() {
  try {
    const u = JSON.parse(localStorage.getItem('kb360-user') || 'null');
    return u && u.email ? String(u.email).toLowerCase().trim() : '';
  } catch { return ''; }
}

/** One-line human summary of a builder config (Saved Views / Scheduled lists). */
export function describeConfig(config) {
  const c = config || {};
  const src = (RUN_SOURCES.find((s) => s.key === c.source) || {}).label || c.source || '';
  const f = c.filters || {};
  const bits = [src.split(' — ')[0]];
  if (c.groupBy) bits.push(`by ${GROUP_LABEL[c.groupBy] || c.groupBy}`);
  if (f.branch && f.branch !== 'ALL') bits.push(f.branch);
  if (f.from && f.to) bits.push(`${f.from} → ${f.to}`);
  return bits.filter(Boolean).join(' · ');
}
