// ─── Accounts Tree View — Parent Group ▸ Group ▸ Sub-Group ▸ Ledger ──────────
// READ-ONLY viewer of the whole chart of accounts (no create / edit here — that
// lives on the dedicated master screens: Masters ▸ Accounts Master ▸ Groups &
// Sub-Groups / Ledgers). Two ways to look at the same hierarchy:
//   • Tree View — expand/collapse structure to understand the hierarchy.
//   • Side-by-Side — Tally-style miller columns (Parent Group → Group → Sub-Group → Ledger).
//
// SCOPE MODEL (important): Groups & Sub-Groups have NO branch — they are ALWAYS
// shared across every branch (org-wide). Only LEDGERS carry a branch: either
// 'ALL' (Common, shared by every branch) or a branch code (branch-specific).
// So this screen lets you pick a Branch view + a ledger Scope filter; the group
// structure never changes, only which ledgers are shown / how they're tagged.
import React, { useState, useEffect, useRef } from 'react';
import { useMasterList } from '../core/useMasters';
import { branchCode, useLedgerUsage } from '../core/useAccounting';
import { FocusBanner } from '../core/ux/FocusBanner';
import { useNavFocusStore } from '../core/ux/navFocus';
import { clickable } from '../core/ux/clickable';
import { listKeyNav } from '../core/ux/listKeys';
import { BRANCH_CODES, CONSOLIDATED_LABEL } from '../core/data';

const DARK = '#1a1c22', DIM = '#5b616e', BLUE = '#2563eb', GREEN = '#16a34a', GOLD = '#c2a04a', GREY = '#7b86a8';
const TALLY_ORDER = [
  'Capital Account', 'Loans (Liability)', 'Bank OD Accounts', 'Secured Loans', 'Unsecured Loans',
  'Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors',
  'Fixed Assets', 'Investments', 'Current Assets', 'Bank Accounts', 'Cash-in-Hand',
  'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors',
  'Sales Accounts', 'Direct Income', 'Purchase Accounts', 'Direct Expenses',
  'Indirect Expenses', 'Indirect Income', 'Opening Stock', 'Closing Stock',
  'Misc. Expenses (Asset)', 'Suspense Account',
];
const badge = (txt, color) => <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: color + '18', color, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{txt}</span>;
// Scope of a single ledger: Common (org-wide 'ALL') vs a specific branch.
const isCommon = (l) => !l.branch || l.branch === 'ALL';
const scopeBadge = (l) => (isCommon(l) ? badge('Common', GREY) : badge(l.branch, BLUE));
// Deactivated ledgers are hidden by default; the "Include inactive" toggle reveals
// them, dimmed and flagged, so the chart can show the full picture on demand.
const AMBER = '#b45309';
const isInactive = (l) => l.active === false;
// A tree root is a top-level primary group ONLY: a system group with no parent.
// The 13 seeded system SUB-groups carry a parent and must render nested under it,
// never also as a second top-level "Parent Group".
export const isRootGroup = (g) => !!(g && g.system && !g.parent);
// Split the fetched ledgers into what the tree should show + how many deactivated
// ones are being hidden. Pure so it can be unit-tested without rendering.
export function partitionLedgers(fetched, includeInactive) {
  const list = fetched || [];
  const inactiveHidden = includeInactive ? 0 : list.filter(isInactive).length;
  const sourceLedgers = includeInactive ? list : list.filter((l) => !isInactive(l));
  return { sourceLedgers, inactiveHidden };
}
// Sum the entry counts of every ledger in a group node's subtree, counting each
// distinct ledger NAME once (a name that appears as several branch copies in the
// consolidated view is one accounting head, so it isn't double-counted). `usage`
// is the { lowerLedgerName: count } map from /api/accounting/ledger-usage. Pure.
export function rollupEntries(node, usage = {}) {
  if (!node) return 0;
  const names = new Set();
  const walk = (n) => { (n.ledgers || []).forEach((l) => names.add((l.name || '').toLowerCase())); (n.children || []).forEach(walk); };
  walk(node);
  let s = 0; names.forEach((nm) => { s += usage[nm] || 0; });
  return s;
}
// "8 common · 4 BOM" style mini-summary for a node's ledger set.
const countNote = (leds) => {
  const c = leds.filter(isCommon).length, b = leds.length - c;
  if (!leds.length) return '';
  return `${c} common${b ? ` · ${b} branch` : ''}`;
};

export function AccountsTreeView({ branch }) {
  const brc = branchCode(branch);                    // undefined for ALL → shows all
  const [branchView, setBranchView] = useState(() => brc || 'ALL'); // in-page branch picker
  const [scope, setScope] = useState('all');         // 'all' | 'common' | 'branch'
  const groupsQ = useMasterList('groups');           // groups/sub-groups are SHARED across branches
  // Ledgers are branch-scoped. A specific branch view fetches that branch + the
  // org-wide 'ALL' ledgers; "All branches" fetches every branch's ledgers.
  // Always fetch inactive ledgers too (includeInactive) so the toggle flips
  // instantly client-side and we can always report how many are hidden.
  const ledgersQ = useMasterList('ledgers', { ...(branchView === 'ALL' ? {} : { branch: branchView }), includeInactive: 'true' });
  // Per-ledger entry counts (how many journal posting-lines reference each ledger),
  // branch-scoped to the in-page Branch view → the "Count" statistics column.
  const usageQ = useLedgerUsage(branchView);
  const [tab, setTab] = useState('tree');           // 'tree' | 'side'
  const [open, setOpen] = useState({});
  const [sel, setSel] = useState({ pg: '', g: '', sg: '' });
  const [includeInactive, setIncludeInactive] = useState(false); // hide deactivated ledgers by default

  const groups = groupsQ.data || [];

  // ── Resolve which ledgers to display, per the Branch view + Scope filter ──
  // Group raw ledgers by name so we can detect a branch copy that OVERRIDES a
  // Common ('ALL') one of the same name (Tally shows only the effective ledger).
  // Deactivated ledgers stay out unless the toggle is on; count the hidden ones.
  const { sourceLedgers, inactiveHidden } = partitionLedgers(ledgersQ.data, includeInactive);
  const byName = new Map();
  sourceLedgers.forEach((l) => { const k = (l.name || '').toLowerCase(); (byName.get(k) || byName.set(k, []).get(k)).push(l); });
  let display = [];
  for (const copies of byName.values()) {
    const common = copies.find(isCommon);
    const branchCopies = copies.filter((c) => !isCommon(c));
    if (branchView === 'ALL') {
      // Consolidated: show the Common copy + every branch-specific copy distinctly.
      if (common) display.push({ ...common });
      branchCopies.forEach((c) => display.push({ ...c }));
    } else {
      // Specific branch: the effective ledger is the branch copy if it exists,
      // else the Common one. Flag it when a branch copy shadows a Common copy.
      const bc = branchCopies.find((c) => c.branch === branchView) || branchCopies[0];
      const eff = bc || common;
      if (eff) display.push({ ...eff, _overrides: !!(bc && common) });
    }
  }
  // Scope filter (ledgers only — groups/sub-groups are always org-wide).
  display = display.filter((l) => (scope === 'all' ? true : scope === 'common' ? isCommon(l) : !isCommon(l)));

  // ── Build the group tree and file the resolved ledgers into it ──
  const nodes = {};
  groups.forEach((g) => { nodes[g.name] = { ...g, children: [], ledgers: [] }; });
  groups.forEach((g) => { if (g.parent && nodes[g.parent]) nodes[g.parent].children.push(nodes[g.name]); });
  display.forEach((l) => { const t = (l.subGroup && nodes[l.subGroup]) ? l.subGroup : l.group; if (nodes[t]) nodes[t].ledgers.push(l); });
  Object.values(nodes).forEach((n) => { n.children.sort((a, b) => (a.name || '').localeCompare(b.name || '')); n.ledgers.sort((a, b) => (a.name || '').localeCompare(b.name || '')); });
  // Roots are ONLY the 16 top-level primary groups (system, no parent). The 13
  // seeded system SUB-groups (Reserves & Surplus, Bank Accounts, Duties & Taxes, …)
  // carry a parent — they must appear nested under it as a "Group", never also as a
  // top-level "Parent Group" (that double-rendered them, most visibly Reserves &
  // Surplus, which — absent from TALLY_ORDER — sorted to the very top).
  const roots = groups.filter(isRootGroup).map((g) => nodes[g.name]).sort((a, b) => (TALLY_ORDER.indexOf(a.name) - TALLY_ORDER.indexOf(b.name)));
  const allKeys = groups.map((g) => g.name);

  // ── Entry-count statistics (Count column) ──
  const usage = usageQ.data || {};
  const entriesFor = (l) => usage[(l.name || '').toLowerCase()] || 0;
  // Roll a group node's entries up from its whole subtree, counting each distinct
  // ledger NAME once (so a ledger that appears as several branch copies of the same
  // name in the consolidated view isn't double-counted).
  const rollupCount = (node) => rollupEntries(node, usage);
  // Flat list for the Inactive tab: every deactivated ledger in the current scope,
  // most-used first (count > 0 ⇒ deactivated but still holds postings — a likely
  // mistake or merge candidate; count 0 ⇒ truly empty, safe to leave/purge).
  const inactiveLedgers = (ledgersQ.data || [])
    .filter(isInactive)
    .filter((l) => (scope === 'all' ? true : scope === 'common' ? isCommon(l) : !isCommon(l)))
    .sort((a, b) => (entriesFor(b) - entriesFor(a)) || (a.name || '').localeCompare(b.name || ''));

  // Header summary counts.
  const subGroupCount = groups.filter((g) => !g.system).length;
  const commonCount = display.filter(isCommon).length;
  const branchCount = display.length - commonCount;

  const tog = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  const setAll = (v) => setOpen(v ? Object.fromEntries(allKeys.map((k) => [k, true])) : {});

  // P4 deep-link: opened from an "idle ledger" Alert → expand the tree down to
  // that ledger (Parent Group ▸ Group ▸ Sub-Group), switch to Tree view, then
  // scroll it into view and highlight it. Applied once per focused name.
  const fLedger = useNavFocusStore((s) => (s.focus && s.focus.params && s.focus.params.kind === 'ledger' ? s.focus.params.name : null));
  const fLower = (fLedger || '').toLowerCase();
  const appliedRef = useRef('');
  useEffect(() => {
    if (!fLedger || !display.length || !groups.length || appliedRef.current === fLedger) return;
    const led = display.find((l) => (l.name || '').toLowerCase() === fLower);
    if (!led) return;
    const filing = (led.subGroup && nodes[led.subGroup]) ? led.subGroup : led.group;
    const opens = {};
    let curName = filing, guard = 0;
    while (curName && nodes[curName] && guard++ < 20) { opens[curName] = true; curName = nodes[curName].parent; }
    setTab('tree');
    setOpen((s) => ({ ...s, ...opens }));
    appliedRef.current = fLedger;
    setTimeout(() => { const el = document.getElementById('led-' + led.id); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 90);
  }, [fLedger, display.length, groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const Caret = ({ k, has }) => <span {...(has ? clickable(() => tog(k)) : {})} style={{ width: 14, display: 'inline-block', color: GOLD, cursor: has ? 'pointer' : 'default' }}>{has ? (open[k] ? '▾' : '▸') : ''}</span>;
  // Entry-count pill shown at the right of every ledger / group row. Muted grey at 0
  // (no postings), solid when the ledger/group has been used. `auto` right-aligns it.
  const countChip = (n, auto = true) => (
    <span title={`${n} ${n === 1 ? 'entry' : 'entries'}`} style={{ marginLeft: auto ? 'auto' : 8, fontSize: 10, fontWeight: 700, color: n ? '#334155' : '#c3cbe0', background: n ? '#eef2f7' : 'transparent', border: `1px solid ${n ? '#d7deea' : 'transparent'}`, padding: '0px 7px', borderRadius: 10, minWidth: 20, textAlign: 'center' }}>{n}</span>
  );
  const ledgerRow = (l, indent) => (
    <div key={'L' + l.id} id={'led-' + l.id} style={{ display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${indent}px`, fontSize: 12, borderBottom: '1px solid #dfe2e7', color: isInactive(l) ? '#9aa2c0' : DARK, background: fLower && (l.name || '').toLowerCase() === fLower ? '#FFF6D6' : undefined }}>
      <span style={{ color: isInactive(l) ? '#c3cbe0' : GREEN, marginRight: 6 }}>•</span>{l.name}{scopeBadge(l)}{isInactive(l) && badge('Inactive', AMBER)}
      {l._overrides && <span style={{ fontSize: 9, color: GOLD, marginLeft: 6, fontStyle: 'italic' }}>overrides Common</span>}
      {countChip(entriesFor(l))}
    </div>
  );
  // Subheading shown above ledgers that hang straight off a Group/Parent Group
  // (no intermediate sub-group) — only when that node also has child groups, so
  // it's clear these ledgers aren't nested under one of those groups.
  const directLabel = (indent) => <div style={{ padding: `4px 12px 3px ${indent}px`, fontSize: 9.5, fontWeight: 700, color: '#9aa2c0', textTransform: 'uppercase', letterSpacing: 0.4, fontStyle: 'italic', background: '#fbfcfe', borderBottom: '1px dashed #eef1f6' }}>— ledgers directly here (no sub-group) —</div>;

  // ── Tree view (read-only structure) ──
  const treeView = () => (
    <div style={{ border: '1px solid #cdd1d8', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {roots.map((pg) => {
        const pgHas = pg.children.length || pg.ledgers.length;
        return (
          <div key={pg.name}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', fontWeight: 800, color: DARK }}>
              <Caret k={pg.name} has={pgHas} /><span {...(pgHas ? clickable(() => tog(pg.name)) : {})} style={{ cursor: pgHas ? 'pointer' : 'default' }}>{pg.name}</span>{badge('Parent Group', BLUE)}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: DIM }}>
                <span>{pg.children.length} group{pg.children.length === 1 ? '' : 's'}{pg.ledgers.length ? ` · ${countNote(pg.ledgers)}` : ''}</span>{countChip(rollupCount(pg), false)}
              </span>
            </div>
            {open[pg.name] && pg.children.map((grp) => {
              const grpHas = grp.children.length || grp.ledgers.length;
              return (
                <div key={grp.name}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px 7px 26px', background: '#f6f9fd', fontWeight: 700, color: '#1a3a6e' }}>
                    <Caret k={grp.name} has={grpHas} /><span {...(grpHas ? clickable(() => tog(grp.name)) : {})} style={{ cursor: grpHas ? 'pointer' : 'default' }}>{grp.name}</span>{badge('Group', '#1a3a6e')}
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: DIM }}>
                      {grp.ledgers.length > 0 && <span>{countNote(grp.ledgers)}</span>}{countChip(rollupCount(grp), false)}
                    </span>
                  </div>
                  {open[grp.name] && <>
                    {grp.children.map((sg) => (
                      <div key={sg.name}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 46px', fontWeight: 600, color: DARK, borderBottom: '1px solid #dfe2e7' }}>
                          <Caret k={sg.name} has={sg.ledgers.length} /><span {...(sg.ledgers.length ? clickable(() => tog(sg.name)) : {})} style={{ cursor: sg.ledgers.length ? 'pointer' : 'default' }}>{sg.name}</span>{badge('Sub-Group', GOLD)}
                          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: DIM }}>
                            {sg.ledgers.length > 0 && <span>{countNote(sg.ledgers)}</span>}{countChip(rollupCount(sg), false)}
                          </span>
                        </div>
                        {open[sg.name] && sg.ledgers.map((l) => ledgerRow(l, 70))}
                      </div>
                    ))}
                    {grp.ledgers.length > 0 && grp.children.length > 0 && directLabel(48)}
                    {grp.ledgers.map((l) => ledgerRow(l, 52))}
                  </>}
                </div>
              );
            })}
            {open[pg.name] && pg.ledgers.length > 0 && pg.children.length > 0 && directLabel(30)}
            {open[pg.name] && pg.ledgers.map((l) => ledgerRow(l, 34))}
          </div>
        );
      })}
    </div>
  );

  // ── Side-by-Side (miller columns) ──
  const col = (title, items, selVal, onPick, kind) => (
    <div style={{ flex: 1, minWidth: 180, border: '1px solid #cdd1d8', borderRadius: 8, background: '#fff', display: 'flex', flexDirection: 'column', maxHeight: '64vh' }}>
      <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #dfe2e7', background: '#f7f8fb' }}>{title} <span style={{ color: '#9aa2c0' }}>({items.length})</span></div>
      <div style={{ overflow: 'auto' }} onKeyDown={onPick ? listKeyNav() : undefined}>
        {items.map((it) => (
          <div key={kind === 'ledger' ? 'L' + it.id : (it.name || it.id)} {...(onPick ? clickable(() => onPick(it), { role: 'option' }) : {})} style={{ padding: '6px 10px', fontSize: 12, cursor: onPick ? 'pointer' : 'default', background: selVal === (it.name) ? '#eef3fb' : 'transparent', borderBottom: '1px solid #dfe2e7', color: DARK, fontWeight: selVal === it.name ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={kind === 'ledger' && isInactive(it) ? { color: '#9aa2c0' } : undefined}>{kind === 'ledger' ? <><span style={{ color: isInactive(it) ? '#c3cbe0' : GREEN, marginRight: 6 }}>•</span>{it.name}{scopeBadge(it)}{isInactive(it) && badge('Inactive', AMBER)}</> : it.name}</span>
            {kind === 'ledger' ? countChip(entriesFor(it)) : (onPick && <span style={{ color: '#c3cbe0' }}>›</span>)}
          </div>
        ))}
        {!items.length && <div style={{ padding: 12, fontSize: 11, color: '#9aa2c0' }}>—</div>}
      </div>
    </div>
  );
  // Effective selection — defaults to the first populated node so the Group /
  // Sub-Group / Ledger columns show immediately (a click still overrides).
  const pgName = sel.pg || (roots.find((r) => r.children.length || r.ledgers.length) || roots[0] || {}).name || '';
  const pgNode = pgName ? nodes[pgName] : null;
  const gName = sel.g || ((pgNode && (pgNode.children.find((c) => c.children.length || c.ledgers.length) || pgNode.children[0])) || {}).name || '';
  const gNode = gName ? nodes[gName] : null;
  const sgName = sel.sg || ((gNode && gNode.children[0]) || {}).name || '';
  const sgNode = sgName ? nodes[sgName] : null;
  const sideView = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {col(`Parent Group (${roots.length})`, roots, pgName, (it) => setSel({ pg: it.name, g: '', sg: '' }))}
      {col('Group', pgNode ? pgNode.children : [], gName, (it) => setSel((s) => ({ ...s, g: it.name, sg: '' })))}
      {col('Sub-Group', gNode ? gNode.children : [], sgName, (it) => setSel((s) => ({ ...s, sg: it.name })))}
      {col('Ledger', sgNode ? sgNode.ledgers : gNode ? gNode.ledgers : pgNode ? pgNode.ledgers : [], '', null, 'ledger')}
    </div>
  );

  // ── Inactive Ledgers (flat list, most-used first) ──
  const inactiveView = () => {
    const th = (t, w) => <th style={{ textAlign: t === 'Entries' || t === 'Opening' ? 'right' : 'left', padding: '8px 12px', fontSize: 10, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #cdd1d8', width: w }}>{t}</th>;
    return (
      <div style={{ border: '1px solid #cdd1d8', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '8px 12px', fontSize: 11.5, color: DIM, background: '#fbfcfe', borderBottom: '1px solid #dfe2e7' }}>
          <b style={{ color: DARK }}>{inactiveLedgers.length}</b> deactivated ledger{inactiveLedgers.length === 1 ? '' : 's'} in this view. A non-zero <b style={{ color: DARK }}>Entries</b> count means the ledger is inactive but still holds postings — likely deactivated by mistake or a merge candidate; <b style={{ color: DARK }}>0</b> means it's empty and safe to leave or purge.
        </div>
        {inactiveLedgers.length ? (
          <div style={{ overflow: 'auto', maxHeight: '68vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f7f8fb', zIndex: 1 }}>
                <tr>{th('Ledger')}{th('Group')}{th('Sub-Group')}{th('Scope', 110)}{th('Entries', 90)}{th('Opening', 120)}</tr>
              </thead>
              <tbody>
                {inactiveLedgers.map((l) => {
                  const n = entriesFor(l);
                  return (
                    <tr key={'IL' + l.id} style={{ borderBottom: '1px solid #dfe2e7' }}>
                      <td style={{ padding: '6px 12px', fontSize: 12, color: DARK, fontWeight: 600 }}>{l.name}{badge('Inactive', AMBER)}</td>
                      <td style={{ padding: '6px 12px', fontSize: 11.5, color: DIM }}>{l.group || '—'}</td>
                      <td style={{ padding: '6px 12px', fontSize: 11.5, color: DIM }}>{l.subGroup || '—'}</td>
                      <td style={{ padding: '6px 12px' }}>{scopeBadge(l)}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: n ? '#b45309' : '#9aa2c0' }}>{n}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 11.5, color: DIM }}>{Number(l.openingBalance || 0).toLocaleString('en-IN')} {l.drCr || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div style={{ padding: 16, fontSize: 12, color: '#9aa2c0' }}>No deactivated ledgers in this branch / scope.</div>}
      </div>
    );
  };

  const tabBtn = (k, l) => <button key={k} onClick={() => setTab(k)} className="max-tablet:min-h-[44px]" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: `3px solid ${tab === k ? GOLD : 'transparent'}`, background: 'transparent', cursor: 'pointer', color: tab === k ? DARK : DIM }}>{l}</button>;
  const scopePill = (k, l) => <button key={k} onClick={() => setScope(k)} className="max-tablet:min-h-[44px]" style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: scope === k ? BLUE : '#fff', color: scope === k ? '#fff' : DIM }}>{l}</button>;

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1600, margin: '0 auto' }}>
      <FocusBanner />
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Accounts Tree View</h2>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>Parent Group ▸ Group ▸ Sub-Group ▸ Ledger · View-only — create under <b>Masters ▸ Accounts Master</b>.</p>
      </div>

      {/* Scope legend — Groups/Sub-Groups are org-wide; only Ledgers carry a branch. */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#f7f9fc', border: '1px solid #cdd1d8', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11.5, color: DIM }}>
        <span><b style={{ color: DARK }}>Groups & Sub-Groups</b> are shared across all branches (org-wide). Only <b style={{ color: DARK }}>Ledgers</b> are branch-scoped:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{badge('Common', GREY)}<span style={{ marginLeft: 4 }}>= shared by every branch (ALL)</span></span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{badge('BOM', BLUE)}<span style={{ marginLeft: 4 }}>= specific to that branch</span></span>
      </div>

      {/* Controls: in-page Branch view + Ledger Scope filter */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM }}>
          Branch view
          <select value={branchView} onChange={(e) => setBranchView(e.target.value)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #cdd1d8', fontSize: 12, minWidth: 150 }}>
            <option value="ALL">{CONSOLIDATED_LABEL}</option>
            {BRANCH_CODES.map((b) => <option key={b} value={b}>{b} + Common</option>)}
          </select>
        </label>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM }}>
          Ledger scope
          <span style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
            {scopePill('all', 'All')}{scopePill('common', 'Common only')}{scopePill('branch', 'Branch-specific only')}
          </span>
        </span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="max-tablet:min-h-[44px]" />
          Include inactive
          {inactiveHidden > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, background: AMBER + '18', padding: '1px 6px', borderRadius: 4 }}>{inactiveHidden} hidden</span>}
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: DIM }}>
          <b style={{ color: DARK }}>{roots.length}</b> parent groups · <b style={{ color: DARK }}>{subGroupCount}</b> sub-groups <span style={{ color: '#9aa2c0' }}>(org-wide)</span> · <b style={{ color: DARK }}>{display.length}</b> ledgers (<b style={{ color: GREY }}>{commonCount}</b> common + <b style={{ color: BLUE }}>{branchCount}</b> branch)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #cdd1d8', marginBottom: 12 }}>
        {tabBtn('tree', 'Tree View')}{tabBtn('side', 'Side-by-Side')}{tabBtn('inactive', `Inactive (${inactiveLedgers.length})`)}
        {tab === 'tree' && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, padding: '4px 0' }}>
            <button onClick={() => setAll(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊞ Expand all</button>
            <button onClick={() => setAll(false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊟ Collapse all</button>
          </span>
        )}
      </div>

      {(groupsQ.isLoading || ledgersQ.isLoading) && (
        <div style={{ padding: 14 }}>
          {Array.from({ length: 7 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.1) }} />)}
        </div>
      )}
      {tab === 'tree' ? treeView() : tab === 'side' ? sideView() : inactiveView()}
    </div>
  );
}

// Back-compat alias — the route/import historically used "ChartBuilder".
export const ChartBuilder = AccountsTreeView;
