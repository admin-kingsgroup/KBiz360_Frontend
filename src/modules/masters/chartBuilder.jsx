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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMasterList } from '../../core/useMasters';
import { branchCode, useLedgerUsage, useBranchParity, useBranchParitySummary, useBranchParityDrill } from '../../core/useAccounting';
import { apiPost } from '../../core/api';
import { confirmDialog } from '../../core/ux/confirm';
import { toastSuccess, toastError } from '../../core/ux/toast';
import { FocusBanner } from '../../core/ux/FocusBanner';
import { useNavFocusStore, setNavFocus } from '../../core/ux/navFocus';
import { clickable } from '../../core/ux/clickable';
import { listKeyNav } from '../../core/ux/listKeys';
import { BRANCH_CODES, BRANCHES, CONSOLIDATED_LABEL } from '../../core/data';

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
const RED = '#dc2626', RED_TINT = '#fef2f2';
// Lock-state marks — shown ALONGSIDE the */~*/NF signs, never replacing them.
// LOCKED (🔒) = non-editable/non-deletable: ALL groups & sub-groups (frozen structure),
// module-wired (~*) heads, and any ledger whose `locked` flag is set. UNLOCKED (🔓) = an
// editable ledger. NOTE: a system-seeded (source='system') LEDGER is NOT automatically
// locked — banks, fixed assets, deposits and parties are seeded system yet stay editable —
// so a ledger's lock is driven by the authoritative `locked` flag, never by source / `*`.
const LOCK_ICON = <span title="Locked — frozen group structure, module-wired head, or a locked ledger; cannot be created, edited or deleted" style={{ fontSize: 10, marginLeft: 3 }}>🔒</span>;
const UNLOCK_ICON = <span title="Unlocked — branch-managed ledger; editable / removable" style={{ fontSize: 10, marginLeft: 3 }}>🔓</span>;
// A ledger's lock mark: locked heads lock (🔒); an active editable ledger unlocks (🔓);
// deactivated rows carry their own Inactive/Removable badge, so no lock mark.
const ledgerLock = (l) => (l.locked ? LOCK_ICON : isInactive(l) ? null : UNLOCK_ICON);
// Side-by-Side sentinel: the "Direct Ledgers" bucket a node exposes when it holds
// ledgers directly AND has child groups — a distinct, selectable item so those
// ledgers don't show implicitly and confuse the Ledger column.
export const DIRECT_LEDGERS = '::direct-ledgers::'; // never a real (trimmed) group name
const isInactive = (l) => l.active === false;
// A ledger is "removable" (safe to delete) when it's deactivated AND holds no
// postings — the backend blocks deleting a ledger that has entries, so an inactive
// ledger WITH entries stays amber ("retired, can't delete yet"), only 0-entry ones
// go red. `n` is the ledger's entry count from the usage map.
export const isRemovable = (l, n) => isInactive(l) && (n || 0) === 0;
// A tree root is a top-level primary group ONLY: a system group with no parent.
// The 13 seeded system SUB-groups carry a parent and must render nested under it,
// never also as a second top-level "Parent Group".
export const isRootGroup = (g) => !!(g && g.system && !g.parent);
// Split the fetched ledgers into what the tree should show + how many are being
// withheld. Presence-HIDDEN ledgers (TK Group Central Table branch toggle) are
// treated like deactivated ones: dropped by default, revealed by the same
// "Include inactive" toggle (with their own badge). Pure — unit-tested.
export const isPresenceHidden = (l) => l.hidden === true;
export function partitionLedgers(fetched, includeInactive) {
  const list = fetched || [];
  const drop = (l) => isInactive(l) || isPresenceHidden(l);
  const inactiveHidden = includeInactive ? 0 : list.filter(drop).length;
  const sourceLedgers = includeInactive ? list : list.filter((l) => !drop(l));
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
// Default Ledger-scope for a Branch view: a specific branch shows only its OWN
// ledgers (Common org-wide ledgers hidden); the consolidated view shows all. Pure.
export const defaultScopeFor = (branchView) => (branchView && branchView !== 'ALL' ? 'branch' : 'all');
// Count groups by TIER for the header summary — level 0 = Parent Group, level 1 =
// Group, level 2+ = Sub-Group. (Counting by `system` folds the custom Groups in with
// Sub-Groups and drops the 13 system Groups, so it never matched the tree.) Pure.
export function groupTierCounts(groups = []) {
  let parents = 0, grps = 0, subs = 0;
  for (const g of (groups || [])) {
    const lv = g.level || 0;
    if (lv === 0) parents++; else if (lv === 1) grps++; else subs++;
  }
  return { parents, groups: grps, subGroups: subs };
}
// Auto-drill target for a Side-by-Side column: the first child worth expanding — BUT
// only when the node has NO ledgers of its own. A node that holds ledgers directly
// (e.g. Capital Account → AD/ND Capital) must show THEM in the Ledger column, not get
// auto-drilled into a child group that hides them. Returns '' → show this node's own
// ledgers. Pure. (A click on a child still overrides via the sel state.)
export function autoChildName(node) {
  if (!node || (node.ledgers && node.ledgers.length)) return '';
  const kids = node.children || [];
  return ((kids.find((c) => (c.children && c.children.length) || (c.ledgers && c.ledgers.length)) || kids[0]) || {}).name || '';
}
// Which ledgers the Side-by-Side Ledger column shows for the selected path. A
// DIRECT_LEDGERS pick at a level shows THAT node's OWN ledgers; otherwise the
// deepest real node's ledgers. Pure. (gName/sgName carry the DIRECT_LEDGERS sentinel
// when the "Direct Ledgers" bucket is selected; gNode/sgNode are then null.)
export function sideLedgerList({ pgNode, gNode, sgNode, gName, sgName }) {
  if (sgName === DIRECT_LEDGERS) return (gNode && gNode.ledgers) || [];
  if (sgNode) return sgNode.ledgers;
  if (gName === DIRECT_LEDGERS) return (pgNode && pgNode.ledgers) || [];
  if (gNode) return gNode.ledgers;
  return (pgNode && pgNode.ledgers) || [];
}
// "8 common · 4 BOM" style mini-summary for a node's ledger set.
const countNote = (leds) => {
  const c = leds.filter(isCommon).length, b = leds.length - c;
  if (!leds.length) return '';
  return `${c} common${b ? ` · ${b} branch` : ''}`;
};

export function AccountsTreeView({ branch, setRoute, setBranch }) {
  const brc = branchCode(branch);                    // undefined for ALL → shows all
  const [branchView, setBranchView] = useState(() => brc || 'ALL'); // in-page branch picker
  // Default to the branch's OWN ledgers in a specific branch view; 'all' when consolidated.
  const [scope, setScope] = useState(() => defaultScopeFor(brc || 'ALL')); // 'all' | 'common' | 'branch'
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
  // Re-apply the scope default whenever the Branch view changes: pick a branch → its
  // own ledgers only; switch to consolidated → all. The pills still override within a view.
  useEffect(() => { setScope(defaultScopeFor(branchView)); }, [branchView]);

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
  // Trust the "removable/red" flag ONLY once the usage counts have actually loaded —
  // otherwise a ledger that has postings would flash red (falsely "safe to delete")
  // during load, or if the endpoint errors. Until then, inactive ledgers stay amber.
  const usageReady = usageQ.isSuccess;
  const removableOf = (l, n) => usageReady && isRemovable(l, n);
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

  // Header summary counts — by TIER (Parent Group ▸ Group ▸ Sub-Group).
  const tierCounts = groupTierCounts(groups);
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
  // Parent Group + Group are the MANDATORY chart backbone — fixed in every branch,
  // and can't be created / edited / deleted. A red * marks them.
  const mandatoryStar = <span title="Mandatory — fixed in all branches; cannot be created, edited or deleted"><span style={{ color: RED, fontWeight: 800, marginLeft: 3 }}>*</span>{LOCK_ICON}</span>;
  // A sub-group wired to a module/posting/tax path → locked. ~ = module-wired, * = non-editable / non-deletable.
  const wiredMark = <span title="Wired to a module — locked (non-editable, non-deletable)"><span style={{ color: RED, fontWeight: 800, marginLeft: 3 }}>~*</span>{LOCK_ICON}</span>;
  const ledgerRow = (l, indent) => {
    const n = entriesFor(l), rm = removableOf(l, n);
    return (
      <div key={'L' + l.id} id={'led-' + l.id} style={{ display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${indent}px`, fontSize: 12, borderBottom: '1px solid #dfe2e7', color: rm ? RED : isInactive(l) ? '#9aa2c0' : DARK, background: fLower && (l.name || '').toLowerCase() === fLower ? '#FFF6D6' : rm ? RED_TINT : undefined }}>
        <span style={{ color: rm ? RED : isInactive(l) ? '#c3cbe0' : GREEN, marginRight: 6 }}>•</span>{l.name}{scopeBadge(l)}{ledgerLock(l)}{rm ? badge('Removable', RED) : isInactive(l) ? badge('Inactive', AMBER) : isPresenceHidden(l) && badge('Hidden', '#64748b')}
        {l._overrides && <span style={{ fontSize: 9, color: GOLD, marginLeft: 6, fontStyle: 'italic' }}>overrides Common</span>}
        {countChip(n)}
      </div>
    );
  };
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
              <Caret k={pg.name} has={pgHas} /><span {...(pgHas ? clickable(() => tog(pg.name)) : {})} style={{ cursor: pgHas ? 'pointer' : 'default' }}>{pg.name}</span>{mandatoryStar}{badge('Parent Group', BLUE)}
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: DIM }}>
                <span>{pg.children.length} group{pg.children.length === 1 ? '' : 's'}{pg.ledgers.length ? ` · ${countNote(pg.ledgers)}` : ''}</span>{countChip(rollupCount(pg), false)}
              </span>
            </div>
            {open[pg.name] && pg.children.map((grp) => {
              const grpHas = grp.children.length || grp.ledgers.length;
              return (
                <div key={grp.name}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px 7px 26px', background: '#f6f9fd', fontWeight: 700, color: '#1a3a6e' }}>
                    <Caret k={grp.name} has={grpHas} /><span {...(grpHas ? clickable(() => tog(grp.name)) : {})} style={{ cursor: grpHas ? 'pointer' : 'default' }}>{grp.name}</span>{mandatoryStar}{badge('Group', '#1a3a6e')}
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, color: DIM }}>
                      {grp.ledgers.length > 0 && <span>{countNote(grp.ledgers)}</span>}{countChip(rollupCount(grp), false)}
                    </span>
                  </div>
                  {open[grp.name] && <>
                    {grp.children.map((sg) => (
                      <div key={sg.name}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 46px', fontWeight: 600, color: DARK, borderBottom: '1px solid #dfe2e7' }}>
                          <Caret k={sg.name} has={sg.ledgers.length} /><span {...(sg.ledgers.length ? clickable(() => tog(sg.name)) : {})} style={{ cursor: sg.ledgers.length ? 'pointer' : 'default' }}>{sg.name}</span>{badge('Sub-Group', GOLD)}{sg.wired ? wiredMark : mandatoryStar}
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
      <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #dfe2e7', background: '#f7f8fb' }}>{title} <span style={{ color: '#9aa2c0' }}>({items.filter((i) => !i.__direct).length})</span></div>
      <div style={{ overflow: 'auto' }} onKeyDown={onPick ? listKeyNav() : undefined}>
        {items.map((it) => {
          const direct = !!it.__direct;                       // the "Direct Ledgers" bucket (a leaf, not a group)
          const n = kind === 'ledger' ? entriesFor(it) : 0;
          const rm = kind === 'ledger' && removableOf(it, n);
          const isGrp = kind !== 'ledger' && !direct;   // any group / sub-group item → locked (~* if wired, else *)
          return (
          <div key={kind === 'ledger' ? 'L' + it.id : (it.name || it.id)} {...(onPick ? clickable(() => onPick(it), { role: 'option' }) : {})} style={{ padding: '6px 10px', fontSize: 12, cursor: onPick ? 'pointer' : 'default', background: selVal === (it.name) ? '#eef3fb' : rm ? RED_TINT : (direct ? '#fbfcfe' : 'transparent'), borderBottom: '1px solid #dfe2e7', color: DARK, fontWeight: selVal === it.name ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontStyle: direct ? 'italic' : undefined }}>
            <span style={kind === 'ledger' ? (rm ? { color: RED } : isInactive(it) ? { color: '#9aa2c0' } : undefined) : (direct ? { color: DIM } : undefined)}>{kind === 'ledger' ? <><span style={{ color: rm ? RED : isInactive(it) ? '#c3cbe0' : GREEN, marginRight: 6 }}>•</span>{it.name}{scopeBadge(it)}{ledgerLock(it)}{rm ? badge('Removable', RED) : isInactive(it) && badge('Inactive', AMBER)}</> : direct ? <><span style={{ color: GREEN, marginRight: 6 }}>•</span>Direct Ledgers</> : <>{it.name}{isGrp && (it.wired ? wiredMark : mandatoryStar)}</>}</span>
            {kind === 'ledger' ? countChip(n) : direct ? countChip(it.__count) : (onPick && <span style={{ color: '#c3cbe0' }}>›</span>)}
          </div>
          );
        })}
        {!items.length && <div style={{ padding: 12, fontSize: 11, color: '#9aa2c0' }}>—</div>}
      </div>
    </div>
  );
  // Effective selection — defaults to the first populated node so the Group /
  // Sub-Group / Ledger columns show immediately (a click still overrides). A node
  // that holds ledgers directly AND has child groups exposes a distinct "Direct
  // Ledgers" bucket (DIRECT_LEDGERS), selected by default so its own ledgers show
  // clearly instead of being hidden behind an auto-selected child group.
  const directItem = (node) => ({ name: DIRECT_LEDGERS, __direct: true, __count: node.ledgers.length });
  const pgName = sel.pg || (roots.find((r) => r.children.length || r.ledgers.length) || roots[0] || {}).name || '';
  const pgNode = pgName ? nodes[pgName] : null;
  const pgSplit = !!(pgNode && pgNode.ledgers.length && pgNode.children.length); // direct ledgers + groups
  const gName = sel.g || (pgSplit ? DIRECT_LEDGERS : autoChildName(pgNode));
  const gNode = (gName && gName !== DIRECT_LEDGERS) ? nodes[gName] : null;
  const gSplit = !!(gNode && gNode.ledgers.length && gNode.children.length);
  const sgName = sel.sg || (gSplit ? DIRECT_LEDGERS : autoChildName(gNode));
  const sgNode = (sgName && sgName !== DIRECT_LEDGERS) ? nodes[sgName] : null;
  // Ledger column reflects the DEEPEST selected item (a "Direct Ledgers" pick shows
  // that node's own ledgers).
  const ledgerList = sideLedgerList({ pgNode, gNode, sgNode, gName, sgName });
  const groupItems = pgNode ? [...(pgSplit ? [directItem(pgNode)] : []), ...pgNode.children] : [];
  const subItems = gNode ? [...(gSplit ? [directItem(gNode)] : []), ...gNode.children] : [];
  const sideView = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {col(`Parent Group (${roots.length})`, roots, pgName, (it) => setSel({ pg: it.name, g: '', sg: '' }))}
      {col('Group', groupItems, gName, (it) => setSel((s) => ({ ...s, g: it.name, sg: '' })))}
      {col('Sub-Group', subItems, sgName, (it) => setSel((s) => ({ ...s, sg: it.name })))}
      {col('Ledger', ledgerList, '', null, 'ledger')}
    </div>
  );

  // ── Inactive Ledgers (flat list, most-used first) ──
  const inactiveView = () => {
    const th = (t, w) => <th style={{ textAlign: t === 'Entries' || t === 'Opening' ? 'right' : 'left', padding: '8px 12px', fontSize: 10, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #cdd1d8', width: w }}>{t}</th>;
    const removableCount = usageReady ? inactiveLedgers.filter((l) => entriesFor(l) === 0).length : 0;
    return (
      <div style={{ border: '1px solid #cdd1d8', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '8px 12px', fontSize: 11.5, color: DIM, background: '#fbfcfe', borderBottom: '1px solid #dfe2e7' }}>
          <b style={{ color: DARK }}>{inactiveLedgers.length}</b> deactivated ledger{inactiveLedgers.length === 1 ? '' : 's'} in this view — <b style={{ color: RED }}>{removableCount}</b> shown in <span style={{ color: RED, fontWeight: 700 }}>red</span> are <b style={{ color: RED }}>Removable</b> (0 entries, safe to delete). The rest hold postings (<span style={{ color: AMBER, fontWeight: 700 }}>amber</span>) and can't be deleted until cleared.
        </div>
        {inactiveLedgers.length ? (
          <div style={{ overflow: 'auto', maxHeight: '68vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f7f8fb', zIndex: 1 }}>
                <tr>{th('Ledger')}{th('Group')}{th('Sub-Group')}{th('Scope', 110)}{th('Entries', 90)}{th('Opening', 120)}</tr>
              </thead>
              <tbody>
                {inactiveLedgers.map((l) => {
                  const n = entriesFor(l), rm = removableOf(l, n);
                  return (
                    <tr key={'IL' + l.id} style={{ borderBottom: '1px solid #dfe2e7', background: rm ? RED_TINT : undefined }}>
                      <td style={{ padding: '6px 12px', fontSize: 12, color: rm ? RED : DARK, fontWeight: 600 }}>{l.name}{rm ? badge('Removable', RED) : badge('Inactive', AMBER)}</td>
                      <td style={{ padding: '6px 12px', fontSize: 11.5, color: DIM }}>{l.group || '—'}</td>
                      <td style={{ padding: '6px 12px', fontSize: 11.5, color: DIM }}>{l.subGroup || '—'}</td>
                      <td style={{ padding: '6px 12px' }}>{scopeBadge(l)}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: n ? AMBER : RED }}>{n}</td>
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

      {/* Scope legend — Groups/Sub-Groups are org-wide; only Ledgers carry a branch. Each
          term sits in its own tinted chip (rather than one run-on line) so the legend
          scans instead of reads like a paragraph. */}
      <div style={{ background: '#eef1f8', border: '1px solid #cdd1d8', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 11.5, color: DIM }}>
        <div style={{ marginBottom: 8 }}>
          <b style={{ color: DARK }}>Groups & Sub-Groups</b> are shared across all branches (org-wide). Only <b style={{ color: DARK }}>Ledgers</b> are branch-scoped:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #dfe2e7', borderRadius: 6, padding: '3px 8px' }}>{badge('Common', GREY)}<span style={{ marginLeft: 4 }}>= shared by every branch (ALL)</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #dfe2e7', borderRadius: 6, padding: '3px 8px' }}>{badge('BOM', BLUE)}<span style={{ marginLeft: 4 }}>= specific to that branch</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #dfe2e7', borderRadius: 6, padding: '3px 8px' }}>{badge('Removable', RED)}<span style={{ marginLeft: 4 }}>= deactivated + 0 entries (safe to delete)</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid #dfe2e7' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #dfe2e7', borderRadius: 6, padding: '3px 8px' }}><span style={{ color: RED, fontWeight: 800 }}>*</span>{LOCK_ICON}<span style={{ marginLeft: 4 }}>= fixed structure — Parent Group / Group / Sub-Group (locked — cannot be created, edited or deleted)</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #dfe2e7', borderRadius: 6, padding: '3px 8px' }}><span style={{ color: RED, fontWeight: 800 }}>~*</span>{LOCK_ICON}<span style={{ marginLeft: 4 }}>= sub-group / ledger wired to a module (locked — non-editable, non-deletable)</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', border: '1px solid #dfe2e7', borderRadius: 6, padding: '3px 8px' }}>{UNLOCK_ICON}<span style={{ marginLeft: 4 }}>= branch-managed ledger (unlocked — editable / removable)</span></span>
        </div>
      </div>

      {/* Controls: in-page Branch view + Ledger Scope filter. Hidden on the
          Travkings Group View — it is org-wide (all branches as columns) and
          carries its own scope/search controls. */}
      {tab !== 'parity' && tab !== 'paritytable' && (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM }}>
          Branch view
          <select value={branchView} onChange={(e) => setBranchView(e.target.value)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #cdd1d8', fontSize: 12, minWidth: 150 }}>
            <option value="ALL">{CONSOLIDATED_LABEL}</option>
            {BRANCH_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
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
          <b style={{ color: DARK }}>{tierCounts.parents}</b> Parent Groups · <b style={{ color: DARK }}>{tierCounts.groups}</b> Groups · <b style={{ color: DARK }}>{tierCounts.subGroups}</b> Sub-Groups <span style={{ color: '#9aa2c0' }}>(org-wide)</span> · <b style={{ color: DARK }}>{display.length}</b> ledgers{scope === 'all' && <> (<b style={{ color: GREY }}>{commonCount}</b> common + <b style={{ color: BLUE }}>{branchCount}</b> branch)</>}
        </span>
      </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #cdd1d8', marginBottom: 12 }}>
        {/* Retired tabs (Side-by-Side, TK Group Central View, Inactive) removed per user
            2026-07-08 — their renderers stay below for the exported/tested pure helpers. */}
        {tabBtn('tree', 'Tree View')}{tabBtn('paritytable', 'TK Group Central Table')}
        {tab === 'tree' && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, padding: '4px 0' }}>
            <button onClick={() => setAll(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊞ Expand all</button>
            <button onClick={() => setAll(false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊟ Collapse all</button>
          </span>
        )}
      </div>

      {tab !== 'parity' && tab !== 'paritytable' && (groupsQ.isLoading || ledgersQ.isLoading) && (
        <div style={{ padding: 14 }}>
          {Array.from({ length: 7 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.1) }} />)}
        </div>
      )}
      {tab === 'paritytable' ? <TravkingsGroupTableView setRoute={setRoute} setBranch={setBranch} /> : treeView()}
    </div>
  );
}

// ─── Travkings Group View — branch-parity of the chart of accounts ───────────
// One master list where every row (Parent Group ▸ Group ▸ Sub-Group ▸ Ledger)
// shows, per branch, a 4-way status. BACKBONE heads — system-seeded (*) and
// module-wired (~*) — exist in every branch by design (★, never ✗); branch-
// specific ledgers (auto/manual/import) show ✓ where they live, ✗ elsewhere.
const PARITY_LBL = { used: 'used', dormant: 'no entry yet', local: 'branch-specific (auto/manual/import)', absent: 'not in this branch' };
const P_GREEN = '#14795f', P_AMBER = '#9a6a12', P_RED = '#b23c2b', P_LOCAL_BD = '#8fc7ae';
const TIER_TAG = { parent: 'Parent', group: 'Group', sub: 'Sub', ledger: 'Ledger' };

// PURE: build the nested tree from the tiered parity payload. Groups nest by
// `parent`, ledgers by `group`; each node gets a stable id, depth and leafCount.
// Exported for unit tests.
export function buildParityTree(data) {
  const D = data || {};
  const branches = D.branches || [];
  const mk = (r, type) => ({
    name: r.name, type, parent: (type === 'ledger' ? r.group : r.parent) || '',
    states: r.states || [], posts: r.posts || [], total: r.total || 0,
    star: !!r.star, tilde: !!r.tilde, backbone: !!r.backbone, locked: !!r.locked,
    present: r.present != null ? r.present : (r.states || []).filter((s) => s !== 'absent').length,
    children: [],
  });
  const groupNodes = [
    ...(D.parentGroups || []).map((r) => mk(r, 'parent')),
    ...(D.groups || []).map((r) => mk(r, 'group')),
    ...(D.subGroups || []).map((r) => mk(r, 'sub')),
  ];
  const ledgerNodes = (D.ledgers || []).map((r) => mk(r, 'ledger'));
  const byName = new Map(groupNodes.map((n) => [n.name, n]));
  const roots = [];
  groupNodes.forEach((n) => { if (!n.parent) { roots.push(n); } else { const p = byName.get(n.parent); (p ? p.children : roots).push(n); } });
  ledgerNodes.forEach((n) => { const p = byName.get(n.parent); if (p) p.children.push(n); else roots.push(n); });
  const rank = { parent: 0, group: 1, sub: 2, ledger: 3 };
  const sortKids = (n) => { n.children.sort((a, b) => (rank[a.type] - rank[b.type]) || a.name.localeCompare(b.name)); n.children.forEach(sortKids); };
  roots.sort((a, b) => a.name.localeCompare(b.name)); roots.forEach(sortKids);
  let uid = 0;
  const stamp = (n, d) => { n.id = 'p' + (uid++); n.depth = d; n.leafCount = n.type === 'ledger' ? 1 : 0; n.children.forEach((c) => { stamp(c, d + 1); n.leafCount += c.leafCount; }); };
  roots.forEach((r) => stamp(r, 0));
  return { roots, branches };
}

// The ★ / ~★ / ✓ / ✗ glyph for one branch cell.
function parityGlyph(state, tilde) {
  const box = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontSize: 13, fontWeight: 700 };
  const star = tilde ? <span><span style={{ fontSize: 10, fontWeight: 800 }}>~</span>★</span> : '★';
  if (state === 'used') return <span style={{ ...box, background: P_GREEN, color: '#fff' }}>{star}</span>;
  if (state === 'dormant') return <span style={{ ...box, background: '#fff', border: `1.5px solid #d8c084`, color: P_AMBER }}>{star}</span>;
  if (state === 'local') return <span style={{ ...box, background: '#fff', border: `1.5px solid ${P_LOCAL_BD}`, color: P_GREEN }}>✓</span>;
  return <span style={{ ...box, color: '#c4907f' }}>✗</span>;
}

function TravkingsGroupView() {
  const parityQ = useBranchParity();
  const { roots, branches } = React.useMemo(() => buildParityTree(parityQ.data), [parityQ.data]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [scope, setScope] = useState('all');   // 'all' | 'backbone' | 'specific'
  const [gapOnly, setGapOnly] = useState(false);
  const [q, setQ] = useState('');
  // Default: parent + group levels open, deeper collapsed (set once when tree first loads).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !roots.length) return;
    const s = new Set();
    const walk = (n) => { if (n.children.length && n.depth >= 1) s.add(n.id); n.children.forEach(walk); };
    roots.forEach(walk); setCollapsed(s); seededRef.current = true;
  }, [roots]);

  const filtering = !!q || gapOnly || scope !== 'all';
  const selfMatch = (n) => {
    if (n.present === 0) return false;
    if (scope === 'backbone' && !n.backbone) return false;
    if (scope === 'specific' && n.backbone) return false;
    if (gapOnly && n.present === branches.length) return false;
    if (q && !n.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  };
  // A node is visible if it self-matches OR any descendant does (keeps ancestors).
  const visible = (n) => {
    let anyChild = false; n.children.forEach((c) => { if (visible(c)) anyChild = true; });
    n._vis = n.present > 0 && (selfMatch(n) || anyChild);
    return n._vis;
  };
  roots.forEach(visible);

  const toggle = (id) => setCollapsed((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const rows = [];
  const push = (n) => {
    if (filtering && !n._vis) return;
    if (n.present === 0) return;
    rows.push(n);
    const isCol = collapsed.has(n.id) && !filtering;
    if (n.children.length && !isCol) n.children.forEach(push);
  };
  roots.forEach(push);

  const tag = (t) => <span style={{ flex: 'none', fontSize: 9, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: '#eef0f4', color: '#556' }}>{TIER_TAG[t]}</span>;
  // Lock mark next to the sign: wired (~*) is always locked; a system (*) or branch
  // ledger locks only when its `locked` flag is set (a system-seeded bank/asset/party
  // is NOT locked); groups & sub-groups are structurally locked in every branch.
  const sign = (n) => {
    const led = n.type === 'ledger';
    const locked = led ? n.locked : true;
    if (n.tilde) return <span style={{ color: P_AMBER, fontWeight: 800, fontFamily: 'monospace' }}>~*{LOCK_ICON}</span>;
    if (n.star) return <span style={{ color: P_GREEN, fontWeight: 800, fontFamily: 'monospace' }}>*{locked ? LOCK_ICON : null}</span>;
    return led ? (locked ? LOCK_ICON : UNLOCK_ICON) : null;
  };
  const scopePill = (k, l) => <button key={k} onClick={() => setScope(k)} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: scope === k ? BLUE : '#fff', color: scope === k ? '#fff' : DIM }}>{l}</button>;

  if (parityQ.isLoading) return <div style={{ padding: 14 }}>{Array.from({ length: 8 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.1) }} />)}</div>;
  if (parityQ.isError) return <div style={{ padding: 16, fontSize: 12, color: RED }}>Couldn’t load branch parity. Try again.</div>;

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', fontSize: 11.5, color: DIM, marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{parityGlyph('used', false)} Used — backbone, has entries</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{parityGlyph('dormant', false)} No entry yet</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{parityGlyph('used', true)} Wired backbone (~★)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{parityGlyph('local', false)} Branch-specific (auto/manual/import)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{parityGlyph('absent', false)} Not in this branch</span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{LOCK_ICON}<span style={{ marginLeft: 4 }}>= locked (groups & wired heads — non-editable)</span></span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{UNLOCK_ICON}<span style={{ marginLeft: 4 }}>= unlocked (branch-managed ledger — editable)</span></span>
      </div>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value.trim())} placeholder="Search groups & ledgers…" style={{ flex: 1, minWidth: 200, padding: '8px 11px', border: '1px solid #cdd1d8', borderRadius: 7, fontSize: 12 }} />
        <span style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
          {scopePill('all', 'All')}{scopePill('backbone', '★ Backbone')}{scopePill('specific', 'Branch-specific')}
        </span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM, cursor: 'pointer' }}>
          <input type="checkbox" checked={gapOnly} onChange={(e) => setGapOnly(e.target.checked)} /> Not in all branches
        </label>
      </div>

      <div style={{ overflow: 'auto', maxHeight: '70vh', border: '1px solid #cdd1d8', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', position: 'sticky', top: 0, background: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: DIM, padding: '10px 12px', borderBottom: '1.5px solid #cdd1d8', whiteSpace: 'nowrap' }}>Group / Ledger</th>
              {branches.map((b) => <th key={b} style={{ textAlign: 'center', width: 56, fontSize: 11, color: DIM, padding: '10px 6px', borderBottom: '1.5px solid #cdd1d8' }}>{b}</th>)}
              <th style={{ textAlign: 'right', width: 74, fontSize: 11, color: DIM, padding: '10px 12px', borderBottom: '1.5px solid #cdd1d8' }}>Posts</th>
              <th style={{ textAlign: 'center', width: 92, fontSize: 11, color: DIM, padding: '10px 8px', borderBottom: '1.5px solid #cdd1d8' }}>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => {
              const hasKids = n.children.length > 0;
              const isCol = collapsed.has(n.id) && !filtering;
              const full = n.present === branches.length;
              return (
                <tr key={n.id} style={{ borderBottom: '1px solid #eef1f5' }}>
                  <td style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', paddingLeft: 8 + n.depth * 20, boxShadow: n.depth === 0 ? `inset 4px 0 0 ${GOLD}` : 'none' }}>
                      {hasKids
                        ? <button type="button" onClick={() => toggle(n.id)} aria-expanded={!isCol} aria-label={`${isCol ? 'Expand' : 'Collapse'} ${n.name}`} style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: DIM, fontSize: 10, transform: isCol ? 'none' : 'rotate(90deg)' }}>▶</button>
                        : <span style={{ width: 16, display: 'inline-block' }} />}
                      {tag(n.type)}
                      {sign(n)}
                      <span style={{ fontWeight: n.type === 'parent' ? 700 : n.type === 'ledger' ? 500 : 620, fontSize: n.type === 'parent' ? 14 : 13, color: n.type === 'ledger' ? '#2a3a34' : DARK }}>{n.name}</span>
                      {hasKids && <span style={{ fontSize: 11, color: '#9aa2c0' }}>{n.leafCount} led{n.leafCount === 1 ? '' : 's'}</span>}
                    </div>
                  </td>
                  {n.states.map((s, i) => (
                    <td key={i} title={`${branches[i]} · ${(n.posts[i] || 0).toLocaleString('en-IN')} posting${(n.posts[i] || 0) === 1 ? '' : 's'} · ${PARITY_LBL[s]}`} style={{ textAlign: 'center', padding: '4px 0', background: s === 'absent' ? '#fcfbfa' : 'transparent' }}>
                      {parityGlyph(s, n.tilde)}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', padding: '4px 12px', fontFamily: 'monospace', fontSize: 12.5, color: n.total ? DARK : '#b7c0ba' }}>{(n.total || 0).toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{n.present}/{branches.length}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: full ? '#e5f3ea' : '#f8efdc', color: full ? '#137a4b' : P_AMBER }}>{full ? 'ALL' : 'PARTLY'}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={branches.length + 3} style={{ padding: 30, textAlign: 'center', color: '#9aa2c0' }}>Nothing matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Travkings Group Table View — count summary ──────────────────────────────
// Compact count table: groups (global, Fixed */Wired ~*, NF=0 monitor) and
// ledgers per branch (Fixed */Wired ~*/Not used/Deactivated/Total, incl. inactive).
// Ledger columns (see backend deriveSummary): Core/Own = the branch's UNLOCKED
// fixed chart — STRUCTURAL (split by base name vs BOM; never 0 for a branch
// that hasn't booked yet); ~*🔒 = module-wired + ALL governance-locked
// statutory heads (never in Core); Not used = untouched INDICATOR (0 postings,
// 0 opening — such rows also count in Core/Own and clear automatically on the
// first entry); Hidden = presence-toggled off; Deact separate.
// Total = Core + Own + ~* (all active — equal across branches).
const SIGN_CLR = { fixed: P_GREEN, own: BLUE, ll: '#7c3aed', wired: P_AMBER, nf: '#3f5a86', hidden: '#64748b', deact: P_RED };

const P_CUR = { BOM: '₹', AMD: '₹', BOMMB: '₹', NBO: '$', DAR: '$', FBM: '$' };
const sameScope = (a, b) => !!a && !!b && a.tier === b.tier && a.branch === b.branch && a.cat === b.cat;

function TravkingsGroupTableView({ setRoute, setBranch }) {
  const q = useBranchParitySummary();
  const [drill, setDrill] = useState(null);   // { tier, branch, cat, label }
  const [dq, setDq] = useState('');
  const drillQ = useBranchParityDrill(drill);
  const d = q.data || {};
  const branches = d.branches || [];
  const grp = d.groups || {};
  const rows = d.ledgers || [];
  const tot = d.ledgerTotals || { fixed: 0, core: 0, own: 0, wired: 0, nf: 0, deactivated: 0, total: 0 };

  const openDrill = (scope) => { setDq(''); setDrill((cur) => (sameScope(cur, scope) ? null : scope)); };
  // Jumps (branch-scoped). Master reuses the existing ?edit=<code> deep-link;
  // Statement switches the shell branch (so the balance matches) then navigates.
  const openMaster = (code) => { if (setRoute && code) setRoute('/masters/ledgers?edit=' + encodeURIComponent(code)); };
  const openStatement = (name, br) => {
    const b = BRANCHES.find((x) => x.code === br);
    if (b && setBranch) setBranch(b);
    setNavFocus('/ledger', { kind: 'ledger', name });
    if (setRoute) setRoute('/ledger');
  };

  if (q.isLoading) return <div style={{ padding: 14 }}>{Array.from({ length: 6 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.1) }} />)}</div>;
  if (q.isError) return <div style={{ padding: 16, fontSize: 12, color: RED }}>Couldn’t load the summary. Try again.</div>;

  const num = (n) => (n || 0).toLocaleString('en-IN');
  const money = (v, br) => (P_CUR[br] || '') + Math.abs(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const chip = (txt, clr) => <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: clr, background: clr + '18', padding: '1px 6px', borderRadius: 5 }}>{txt}</span>;
  const th = (extra) => ({ fontSize: 11, color: DIM, fontWeight: 700, padding: '8px 10px', borderBottom: '1.5px solid #cdd1d8', whiteSpace: 'nowrap', textAlign: 'right', ...extra });
  const sep = { borderLeft: '2px solid #e6f0ec' };
  const gcellTd = { padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #eef1f5' };

  // A tappable number cell (44px touch target). scope=null → plain (non-interactive).
  const cell = (v, clr, scope, extraTd, bold) => {
    const on = v > 0 && scope;
    const active = sameScope(drill, scope);
    return (
      <td style={{ padding: 0, borderBottom: '1px solid #eef1f5', ...extraTd }}>
        <button type="button" disabled={!on} onClick={() => on && openDrill(scope)}
          aria-label={scope ? `${v} — tap to list` : undefined}
          style={{ appearance: 'none', border: 0, width: '100%', minHeight: 40, padding: '8px 10px', textAlign: 'right',
            font: 'inherit', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontWeight: bold ? 700 : 500,
            background: active ? P_GREEN : 'transparent', color: active ? '#fff' : (v === 0 ? '#b7c0ba' : (clr || DARK)),
            cursor: on ? 'pointer' : 'default' }}>{num(v)}</button>
      </td>
    );
  };
  // Group tier cells — clickable (list group names) for fixed/wired; NF is 0/non-interactive.
  const gCols = (br) => (
    <>
      {cell(grp.parent?.fixed ?? 0, '#7d8a83', grp.parent?.fixed ? { tier: 'parent', cat: 'fixed', label: 'Parent Group · Fixed (*)' } : null, sep)}
      {cell(grp.parent?.wired ?? 0, '#7d8a83', grp.parent?.wired ? { tier: 'parent', cat: 'wired' } : null)}
      <td style={{ ...gcellTd, color: '#b7c0ba' }}>{grp.parent?.nf ?? 0}</td>
      {cell(grp.group?.fixed ?? 0, '#7d8a83', grp.group?.fixed ? { tier: 'group', cat: 'fixed', label: 'Group · Fixed (*)' } : null, sep)}
      {cell(grp.group?.wired ?? 0, '#7d8a83', grp.group?.wired ? { tier: 'group', cat: 'wired' } : null)}
      <td style={{ ...gcellTd, color: '#b7c0ba' }}>{grp.group?.nf ?? 0}</td>
      {cell(grp.sub?.fixed ?? 0, '#7d8a83', grp.sub?.fixed ? { tier: 'sub', cat: 'fixed', label: 'Sub-Group · Fixed (*)' } : null, sep)}
      {cell(grp.sub?.wired ?? 0, '#7d8a83', grp.sub?.wired ? { tier: 'sub', cat: 'wired', label: 'Sub-Group · Wired (~*)' } : null)}
      <td style={{ ...gcellTd, color: '#b7c0ba' }}>{grp.sub?.nf ?? 0}</td>
    </>
  );

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', fontSize: 11.5, color: DIM, marginBottom: 10 }}>
        <span>{chip('OL', SIGN_CLR.fixed)} Open Ledgers — the branch's open chart (shared org-wide)</span>
        <span>{chip('LL', SIGN_CLR.ll)} Lock Ledgers — locked by you via the 🔓 toggle (unlockable)</span>
        <span>{chip('~*', SIGN_CLR.wired)} Wired / statutory (module + tax heads 🔒 — ERP-managed)</span>
        <span>{chip('Not used', SIGN_CLR.nf)} Untouched (0 entries, 0 balance) — clears on first entry</span>
        <span>{chip('Hidden', SIGN_CLR.hidden)} Toggled off for that branch (restorable)</span>
        <span>{chip('Deact', SIGN_CLR.deact)} Deactivated</span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{LOCK_ICON}<span style={{ marginLeft: 3 }}>Locked — groups & wired heads (non-editable)</span></span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{UNLOCK_ICON}<span style={{ marginLeft: 3 }}>Unlocked — branch-managed ledgers (editable)</span></span>
        <span style={{ color: SIGN_CLR.fixed, fontWeight: 700 }}>👆 Tap any number to list what’s behind it</span>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #cdd1d8', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 1120 }}>
          <thead>
            <tr>
              <th style={{ ...th({ textAlign: 'left' }), position: 'sticky', left: 0, zIndex: 3, background: '#fff' }}></th>
              <th colSpan={3} style={{ ...th({ textAlign: 'center' }), ...sep }}>Parent Group</th>
              <th colSpan={3} style={{ ...th({ textAlign: 'center' }), ...sep }}>Group</th>
              <th colSpan={3} style={{ ...th({ textAlign: 'center' }), ...sep }}>Sub-Group</th>
              <th colSpan={7} style={{ ...th({ textAlign: 'center' }), ...sep }}>Ledgers (total)</th>
            </tr>
            <tr>
              <th style={{ ...th({ textAlign: 'left' }), position: 'sticky', left: 0, zIndex: 3, background: '#fff' }}>Branch</th>
              {/* Group tiers are structurally locked (both * and ~*); NF is always 0. */}
              <th style={{ ...th(), ...sep }}>*{LOCK_ICON}</th><th style={th()}>~*{LOCK_ICON}</th><th style={th()}>NF</th>
              <th style={{ ...th(), ...sep }}>*{LOCK_ICON}</th><th style={th()}>~*{LOCK_ICON}</th><th style={th()}>NF</th>
              <th style={{ ...th(), ...sep }}>*{LOCK_ICON}</th><th style={th()}>~*{LOCK_ICON}</th><th style={th()}>NF</th>
              {/* Ledger tier: OL = the open chart (structural, shared org-wide); LL = user-locked (🔓 toggle, reversible); ~*🔒 = module-wired + tax statutory heads (ERP-managed); Total = OL + LL + ~*; Not used = untouched indicator (clears on first entry). Hidden/Deact shown apart, not in Total. */}
              <th style={{ ...th(), ...sep }}>OL</th><th style={th()}>LL{LOCK_ICON}</th><th style={th()}>~*{LOCK_ICON}</th><th style={th()}>Total</th><th style={th()}>Not used</th><th style={th()}>Hidden</th><th style={th()}>Deact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.branch}>
                <td style={{ padding: '9px 10px', fontWeight: 650, color: DARK, borderBottom: '1px solid #eef1f5', position: 'sticky', left: 0, zIndex: 2, background: '#fff', boxShadow: '1px 0 0 #eef1f5' }}>{r.branch}</td>
                {gCols(r.branch)}
                {cell(r.fixed, SIGN_CLR.fixed, { tier: 'ledger', branch: r.branch, cat: 'fixed' }, sep)}
                {cell(r.ll ?? 0, SIGN_CLR.ll, { tier: 'ledger', branch: r.branch, cat: 'll' })}
                {cell(r.wired, SIGN_CLR.wired, { tier: 'ledger', branch: r.branch, cat: 'wired' })}
                {cell(r.activeTotal ?? ((r.fixed || 0) + (r.wired || 0)), DARK, { tier: 'ledger', branch: r.branch, cat: 'active' }, null, true)}
                {cell(r.notUsed ?? 0, SIGN_CLR.nf, { tier: 'ledger', branch: r.branch, cat: 'notused' })}
                {cell(r.hidden ?? 0, SIGN_CLR.hidden, { tier: 'ledger', branch: r.branch, cat: 'hidden' })}
                {cell(r.deactivated, SIGN_CLR.deact, { tier: 'ledger', branch: r.branch, cat: 'deactivated' })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f6faf8' }}>
              <td style={{ padding: '11px 10px', fontWeight: 700, color: DARK, borderTop: '2px solid #cdd1d8', position: 'sticky', left: 0, zIndex: 2, background: '#f6faf8', boxShadow: '1px 0 0 #eef1f5' }}>All</td>
              {[['parent', 'fixed'], ['parent', 'wired'], ['parent', 'nf'], ['group', 'fixed'], ['group', 'wired'], ['group', 'nf'], ['sub', 'fixed'], ['sub', 'wired'], ['sub', 'nf']].map(([t, c], i) => (
                <td key={t + c} style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: '#b3bcb6', fontWeight: 700, borderTop: '2px solid #cdd1d8', ...(i % 3 === 0 ? sep : {}) }}>{grp[t]?.[c] ?? 0}</td>
              ))}
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: SIGN_CLR.fixed, fontWeight: 700, borderTop: '2px solid #cdd1d8', ...sep }}>{num(tot.fixed)}</td>
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: SIGN_CLR.ll, fontWeight: 700, borderTop: '2px solid #cdd1d8' }}>{num(tot.ll ?? 0)}</td>
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: SIGN_CLR.wired, fontWeight: 700, borderTop: '2px solid #cdd1d8' }}>{num(tot.wired)}</td>
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: DARK, fontWeight: 800, borderTop: '2px solid #cdd1d8' }}>{num(tot.activeTotal ?? ((tot.fixed || 0) + (tot.wired || 0)))}</td>
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: SIGN_CLR.nf, fontWeight: 700, borderTop: '2px solid #cdd1d8' }}>{num(tot.notUsed ?? 0)}</td>
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: SIGN_CLR.hidden, fontWeight: 700, borderTop: '2px solid #cdd1d8' }}>{num(tot.hidden ?? 0)}</td>
              <td style={{ padding: '11px 10px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: SIGN_CLR.deact, fontWeight: 700, borderTop: '2px solid #cdd1d8' }}>{num(tot.deactivated)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {drill && <DrillPanel scope={drill} q={drillQ} dq={dq} setDq={setDq} onClose={() => setDrill(null)} money={money} num={num} openMaster={openMaster} openStatement={openStatement} />}

      <div style={{ marginTop: 12, fontSize: 11.5, color: DIM, background: '#f7f9fc', border: '1px solid #cdd1d8', borderLeft: `3px solid ${P_GREEN}`, borderRadius: 8, padding: '10px 13px' }}>
        <b style={{ color: DARK }}>Tap a count to drill in.</b> Group cells list the group names; ledger cells list that branch’s ledgers with <b>postings</b> &amp; <b>closing balance</b>. In the list: tap a <b>name</b> → Master detail, tap a <b>balance</b> → Ledger Statement (scoped to that branch). Groups are global (identical every branch); ledgers vary. <b>OL</b> (Open Ledgers) = the branch's open chart — shared org-wide, equal across branches by design; <b>LL</b> (Lock Ledgers) = ledgers you locked via the 🔓 toggle (tap the count, then 🔒, to unlock back to OL); <b>~*🔒</b> = module-wired + tax statutory heads (GST/VAT sets, control heads — ERP-managed, never under OL/LL). <b>Total = OL + LL + ~*</b> (all active ledgers — equal across branches). <b>Not used</b> is an indicator of untouched open ledgers (0 entries, 0 balance) — they drop off automatically on their first entry. <b>Hidden</b> = presence-toggled off (tap the count, then the branch pill, to restore); <b>Deact</b> is separate; neither counts in Total.
      </div>
    </div>
  );
}

// One ledger's six branch-presence pills (Core/Own drill only). Green = active
// here, amber = deactivated (history kept), dashed grey = not in this branch.
// Tap: ON adds (reactivate / clone from a donor branch); OFF is the SMART remove
// (0 entries → delete, has entries → deactivate). Locked (wired/tax) heads are
// ERP-managed — shown with a lock, not tappable.
function PresenceToggles({ item, num }) {
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['master', 'ledgers'] }); };
  const m = useMutation({
    mutationFn: (body) => apiPost('/api/ledgers/branch-presence', body),
    onSuccess: (res, vars) => {
      const act = (res && res.data && res.data.action) || (vars.enable ? 'added' : 'removed');
      toastSuccess(`${item.name} — ${act} in ${vars.branch}`);
      refresh();
    },
    onError: (e) => toastError((e && e.message) || 'Could not change branch presence'),
  });
  // Org-wide lock toggle: locking moves the head from * to ~*🔒 in EVERY branch
  // (and back on unlock) — counts shift together, so branches stay equal.
  const lockM = useMutation({
    mutationFn: (body) => apiPost('/api/ledgers/lock', body),
    onSuccess: (res, vars) => { toastSuccess(`${item.name} — ${vars.locked ? 'locked → moved to LL' : 'unlocked → back to OL'}`); refresh(); },
    onError: (e) => toastError((e && e.message) || 'Could not change the lock'),
  });
  // Org-wide deactivate/restore: parks a not-needed head in Deact (every
  // branch), or brings it back. Blocked for statutory + LL-locked heads.
  const deactM = useMutation({
    mutationFn: (body) => apiPost('/api/ledgers/active', body),
    onSuccess: (res, vars) => { toastSuccess(`${item.name} — ${vars.active ? 'restored from Deact' : 'moved to Deact'}`); refresh(); },
    onError: (e) => toastError((e && e.message) || 'Could not change activation'),
  });
  const headLocked = (item.presence || []).some((p) => p.locked);
  const anyLive = (item.presence || []).some((p) => p.state === 'active' || p.state === 'hidden');
  const anyInactive = (item.presence || []).some((p) => p.state === 'inactive');
  const flipActive = async () => {
    if (item.statutory || headLocked || deactM.isPending) return;
    const toDeact = anyLive;
    const totalPosts = (item.presence || []).reduce((s, p) => s + (p.posts || 0), 0);
    if (toDeact && totalPosts > 0) {   // posted head → confirm; untouched → instant
      const { confirmed } = await confirmDialog({
        title: `Deactivate “${item.name}”?`,
        message: `It holds ${num(totalPosts)} posted entr${totalPosts === 1 ? 'y' : 'ies'} across branches — the entries stay untouched, but the ledger moves to the Deact column in every branch and can no longer be posted to. Restore it anytime from the Deact drill.`,
        danger: true, confirmLabel: 'Deactivate',
      });
      if (!confirmed) return;
    }
    deactM.mutate({ name: item.name, active: !toDeact });
  };
  const flipLock = async () => {
    if (item.statutory || lockM.isPending) return;
    const toLock = !headLocked;
    const { confirmed } = await confirmDialog({
      title: `${toLock ? 'Lock' : 'Unlock'} “${item.name}”?`,
      message: toLock
        ? 'Locks this head in EVERY branch: it moves to the LL (Lock Ledgers) column, becomes non-editable / non-deletable in the app, and its branch toggles freeze.'
        : 'Unlocks this head in EVERY branch: it moves back to the OL (Open Ledgers) column and becomes branch-manageable again.',
      danger: toLock, confirmLabel: toLock ? 'Lock' : 'Unlock',
    });
    if (confirmed) lockM.mutate({ name: item.name, locked: toLock });
  };
  const flip = async (p) => {
    if (p.locked || m.isPending) return;
    if (p.state === 'active') {
      // Untouched ledger (0 entries) → hides instantly on tap; the confirm
      // dialog appears ONLY when the ledger holds posted entries — that's the
      // case worth a second look before hiding.
      if (p.posts > 0) {
        const { confirmed } = await confirmDialog({
          title: `Hide “${item.name}” in ${p.br}?`,
          message: `It holds ${num(p.posts)} posted entr${p.posts === 1 ? 'y' : 'ies'} in ${p.br} — the entries stay untouched, but the ledger moves to the Hidden column and leaves the pickers. Toggle it back on anytime to restore.`,
          danger: true, confirmLabel: 'Hide',
        });
        if (!confirmed) return;
      }
      m.mutate({ name: item.name, branch: p.br, enable: false });
    } else {
      m.mutate({ name: item.name, branch: p.br, enable: true });   // unhide / reactivate / clone — additive, no confirm
    }
  };
  const pill = (p) => ({
    appearance: 'none', cursor: p.locked ? 'not-allowed' : 'pointer', fontSize: 8.5, fontWeight: 800,
    padding: '3px 5px', borderRadius: 5, letterSpacing: 0.2, opacity: m.isPending ? 0.5 : p.locked ? 0.55 : 1,
    ...(p.state === 'active' ? { background: P_GREEN, color: '#fff', border: `1px solid ${P_GREEN}` }
      : p.state === 'hidden' ? { background: '#e5e9f0', color: '#4a5568', border: '1px solid #c3cbe0', textDecoration: 'line-through' }
      : p.state === 'inactive' ? { background: '#fff', color: P_AMBER, border: '1px solid #d8c084' }
      : { background: '#fff', color: '#9aa2c0', border: '1px dashed #cdd1d8' }),
  });
  const hint = (p) => p.locked ? 'locked — ERP-managed head'
    : p.state === 'active' ? 'tap to hide in this branch'
    : p.state === 'hidden' ? 'hidden — tap to restore'
    : p.state === 'inactive' ? 'deactivated — tap to reactivate'
    : 'tap to add to this branch';
  return (
    <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'nowrap', alignItems: 'center' }}>
      {(item.presence || []).map((p) => (
        <button key={p.br} type="button" disabled={p.locked || m.isPending} onClick={() => flip(p)} style={pill(p)}
          title={`${p.br} · ${p.state}${p.posts ? ` · ${num(p.posts)} entries` : ''} · ${hint(p)}`}>
          {p.br}{p.locked ? '🔒' : ''}
        </button>
      ))}
      {item.statutory
        ? <span title="Statutory / module head — its lock is ERP-managed" style={{ fontSize: 12, marginLeft: 3, opacity: 0.55, cursor: 'not-allowed' }}>🔒</span>
        : (
          <button type="button" disabled={lockM.isPending} onClick={flipLock}
            title={headLocked ? 'Locked (org-wide) — tap to unlock, moves back to OL' : 'Tap to lock (org-wide) — moves to LL'}
            style={{ appearance: 'none', border: `1px solid ${headLocked ? '#d8c084' : '#cdd1d8'}`, background: headLocked ? '#fdf6e3' : '#fff', borderRadius: 5, padding: '2px 5px', fontSize: 11, cursor: 'pointer', marginLeft: 3, opacity: lockM.isPending ? 0.5 : 1 }}>
            {headLocked ? '🔒' : '🔓'}
          </button>
        )}
      {!item.statutory && !headLocked && (anyLive || anyInactive) && (
        <button type="button" disabled={deactM.isPending} onClick={flipActive}
          title={anyLive ? 'Deactivate (org-wide) — moves to the Deact column; restorable' : 'Restore (org-wide) — brings it back from Deact'}
          style={{ appearance: 'none', border: `1px solid ${anyLive ? '#f3c1bb' : '#bcd8ce'}`, background: anyLive ? '#fef2f2' : '#effaf5', color: anyLive ? '#b23c2b' : '#14795f', borderRadius: 5, padding: '2px 5px', fontSize: 11, fontWeight: 800, cursor: 'pointer', marginLeft: 2, opacity: deactM.isPending ? 0.5 : 1 }}>
          {anyLive ? '⊘' : '↺'}
        </button>
      )}
    </span>
  );
}

// Drill-down list shown below the table. Ledgers → name (→Master) / group / postings
// / closing balance (→Statement); groups → names. Its own scroll region + search.
// Core/Own drills are RICH: a Kind tag per ledger, a kind-mix summary in the header,
// and per-branch presence toggles (add / smart-remove a head branch by branch).
// Ledger drills offer TWO layouts: Tree (default — Parent Group ▸ Group ▸ Sub-Group
// ▸ Ledger with collapse/expand, mirrors the Accounts Tree filing) and Flat.
function DrillPanel({ scope, q, dq, setDq, onClose, money, num, openMaster, openStatement }) {
  const data = q.data || {};
  const all = data.items || [];
  const isLedger = scope.tier === 'ledger';
  const rich = isLedger && all.some((x) => Array.isArray(x.presence));   // core/own/hidden drill
  const [view, setView] = useState('tree');            // 'tree' | 'flat' (ledger drills)
  const [closed, setClosed] = useState(() => new Set()); // collapsed group names (tree)
  const groupsQ = useMasterList('groups');             // shared cache with the Accounts Tree
  const ql = dq.trim().toLowerCase();
  const items = ql ? all.filter((x) => (x.name || '').toLowerCase().includes(ql) || (x.group || '').toLowerCase().includes(ql) || (x.kind || '').toLowerCase().includes(ql)) : all;
  let totC = 0, net = 0;
  if (isLedger) items.forEach((l) => { totC += l.count || 0; net += l.closingBalance || 0; });
  // "Which types of ledgers are in this count" — kind mix, biggest first.
  const kindMix = rich ? [...items.reduce((m, l) => m.set(l.kind || 'Other', (m.get(l.kind || 'Other') || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]) : [];
  const groupsReady = !!(groupsQ.data && groupsQ.data.length);
  const treeMode = isLedger && view === 'tree' && groupsReady;

  const wrap = { marginTop: 16, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 12, overflow: 'hidden' };
  const head = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '11px 14px', borderBottom: '1px solid #eef1f5', background: '#f7faf8' };
  const dth = { position: 'sticky', top: 0, background: '#fff', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em', color: DIM, fontWeight: 700, padding: '9px 12px', borderBottom: '1.5px solid #cdd1d8', whiteSpace: 'nowrap' };
  const viewBtn = (k, l) => (
    <button key={k} type="button" onClick={() => setView(k)}
      style={{ appearance: 'none', padding: '6px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: view === k ? BLUE : '#fff', color: view === k ? '#fff' : DIM }}>{l}</button>
  );
  const smallBtn = (label, onClick, title) => (
    <button type="button" onClick={onClick} title={title} style={{ appearance: 'none', padding: '6px 10px', fontSize: 11, fontWeight: 700, border: '1px solid #cdd1d8', borderRadius: 7, background: '#fff', color: DARK, cursor: 'pointer' }}>{label}</button>
  );
  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{data.label || scope.label || 'Details'}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: DIM }}>{q.isLoading ? '…' : items.length + (isLedger ? ' ledgers' : ' groups')}</span>
        {(data.excludedNotUsed || 0) > 0 && (
          <span title="Untouched ledgers (0 entries, 0 balance) are not listed here — tap the Not used count to see and manage them" style={{ fontSize: 10.5, fontWeight: 700, color: '#3f5a86', background: '#3f5a8618', padding: '3px 9px', borderRadius: 999 }}>
            + {data.excludedNotUsed} untouched → see Not used
          </span>
        )}
        <span style={{ flex: 1, minWidth: 140 }}><input value={dq} onChange={(e) => setDq(e.target.value)} placeholder="Search…" style={{ width: '100%', padding: '9px 11px', border: '1px solid #cdd1d8', borderRadius: 8, fontSize: 13 }} /></span>
        {isLedger && (
          <span style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
            {viewBtn('tree', '🌳 Tree')}{viewBtn('flat', '☰ Flat')}
          </span>
        )}
        {treeMode && smallBtn('⊞', () => setClosed(new Set()), 'Expand all')}
        {treeMode && smallBtn('⊟', () => setClosed(new Set((groupsQ.data || []).map((g) => g.name))), 'Collapse all')}
        <button type="button" onClick={onClose} aria-label="Close" style={{ appearance: 'none', border: '1px solid #cdd1d8', background: '#fff', borderRadius: 8, minHeight: 40, minWidth: 40, cursor: 'pointer', fontWeight: 700, color: DIM }}>✕</button>
      </div>
      {rich && !q.isLoading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #eef1f5', background: '#fbfcfe', fontSize: 11, color: DIM }}>
          <b style={{ color: DARK }}>Ledger types:</b>
          {kindMix.map(([k, n]) => (
            <button key={k} type="button" onClick={() => setDq(dq.trim().toLowerCase() === k.toLowerCase() ? '' : k)}
              style={{ appearance: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, border: '1px solid #cdd1d8', background: dq.trim().toLowerCase() === k.toLowerCase() ? P_GREEN : '#fff', color: dq.trim().toLowerCase() === k.toLowerCase() ? '#fff' : '#3b4752' }}>
              {k} × {n}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: '#9aa2c0' }}>Branch pills: green = active · grey struck = hidden · amber = deactivated · dashed = absent · tap to hide / restore</span>
        </div>
      )}
      <div style={{ maxHeight: '56vh', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {q.isLoading ? <div style={{ padding: 24 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8 }} />)}</div>
          : !items.length ? <div style={{ padding: 28, textAlign: 'center', color: '#9aa8a1' }}>Nothing here.</div>
          : !isLedger ? (
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
              <thead><tr><th style={{ ...dth, textAlign: 'left' }}>Group / Sub-Group</th><th style={{ ...dth, textAlign: 'left' }}>Sign</th></tr></thead>
              <tbody>{items.map((g) => <tr key={g.name}><td style={{ padding: '11px 12px', fontWeight: 600, borderBottom: '1px solid #eef1f5' }}>{g.name}</td><td style={{ padding: '11px 12px', color: DIM, borderBottom: '1px solid #eef1f5' }}>{scope.cat === 'wired' ? '~*' : '*'}{LOCK_ICON}</td></tr>)}</tbody>
            </table>
          ) : (() => {
            // Shared ledger row for both layouts. Tree mode drops the Group column
            // (the hierarchy shows it) and indents the name under its group.
            const nCols = 4 + (rich ? 1 : 0) + (treeMode ? 0 : 1); // name+kind+postings+balance (+branches when rich, +group in flat)
            const ledgerTr = (l, indent = 0) => {
              const z = Math.abs(l.closingBalance || 0) < 0.005;
              return (
                <tr key={l.code || l.name}>
                  <td style={{ padding: 0, borderBottom: '1px solid #eef1f5' }}>
                    <button type="button" onClick={() => openMaster(l.code)} title="Open Master detail"
                      style={{ appearance: 'none', border: 0, background: 'transparent', font: 'inherit', fontWeight: 600, color: P_GREEN, textDecoration: 'underline', textDecorationColor: '#bcd8ce', textUnderlineOffset: 2, cursor: 'pointer', padding: `11px 12px 11px ${12 + indent * 18}px`, textAlign: 'left', width: '100%', minHeight: 44 }}>
                      <span style={{ color: GREEN, marginRight: 6 }}>•</span>{l.name}</button>
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#eef0f4', color: '#556' }}>{l.kind || 'Other'}</span></td>
                  {!treeMode && <td style={{ padding: '11px 12px', color: DIM, fontSize: 12.5, borderBottom: '1px solid #eef1f5' }}>{l.group}{l.subGroup ? <span style={{ color: '#9aa2c0' }}> ▸ {l.subGroup}</span> : null}</td>}
                  {rich && <td style={{ padding: '8px 12px', borderBottom: '1px solid #eef1f5', whiteSpace: 'nowrap' }}><PresenceToggles item={l} num={num} /></td>}
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: DIM, borderBottom: '1px solid #eef1f5' }}>{num(l.count)}</td>
                  <td style={{ padding: 0, borderBottom: '1px solid #eef1f5' }}>
                    <button type="button" onClick={() => openStatement(l.name, scope.branch)} title="Open Ledger Statement"
                      style={{ appearance: 'none', border: 0, background: 'transparent', font: 'inherit', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600, cursor: 'pointer', padding: '11px 12px', textAlign: 'right', width: '100%', minHeight: 44, color: z ? '#9aa8a1' : (l.closingBalance >= 0 ? SIGN_CLR.fixed : SIGN_CLR.deact) }}>
                      {z ? '0.00' : money(l.closingBalance, scope.branch)} {z ? '' : (l.closingBalance >= 0 ? 'Dr' : 'Cr')}
                    </button>
                  </td>
                </tr>
              );
            };

            let bodyRows;
            if (treeMode) {
              // File the (already search/kind-filtered) ledgers into the shared
              // group hierarchy — same rule as the Accounts Tree (subGroup wins).
              const gs = groupsQ.data || [];
              const nodes = {};
              gs.forEach((g) => { nodes[g.name] = { ...g, children: [], ledgers: [] }; });
              gs.forEach((g) => { if (g.parent && nodes[g.parent]) nodes[g.parent].children.push(nodes[g.name]); });
              const orphans = [];
              items.forEach((l) => { const t = (l.subGroup && nodes[l.subGroup]) ? l.subGroup : l.group; if (nodes[t]) nodes[t].ledgers.push(l); else orphans.push(l); });
              const leafN = (n) => n.ledgers.length + n.children.reduce((s, c) => s + leafN(c), 0);
              const postsN = (n) => n.ledgers.reduce((s, l) => s + (l.count || 0), 0) + n.children.reduce((s, c) => s + postsN(c), 0);
              const roots = gs.filter(isRootGroup).map((g) => nodes[g.name])
                .sort((a, b) => TALLY_ORDER.indexOf(a.name) - TALLY_ORDER.indexOf(b.name))
                .filter((n) => leafN(n) > 0);
              const filtering = !!ql;   // searching → show everything expanded
              const TIER = (lv) => (lv === 0 ? ['Parent Group', BLUE, '#eef3fb', 800] : lv === 1 ? ['Group', '#1a3a6e', '#f6f9fd', 700] : ['Sub-Group', GOLD, '#fbfcfe', 650]);
              const groupTr = (n, depth, lc) => {
                const [tag, clr, bg, fw] = TIER(n.level || 0);
                const isClosed = closed.has(n.name) && !filtering;
                return (
                  <tr key={'G' + n.name}>
                    <td colSpan={nCols} style={{ padding: 0, background: bg, borderBottom: '1px solid #e2e8f2', borderTop: depth === 0 ? '1px solid #dbe5f3' : undefined }}>
                      <button type="button" onClick={() => setClosed((s) => { const x = new Set(s); x.has(n.name) ? x.delete(n.name) : x.add(n.name); return x; })}
                        aria-expanded={!isClosed}
                        style={{ appearance: 'none', border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: `8px 12px 8px ${10 + depth * 18}px`, fontWeight: fw, color: DARK, minHeight: 40 }}>
                        <span style={{ color: GOLD, width: 12, display: 'inline-block' }}>{isClosed ? '▸' : '▾'}</span>
                        {n.name}{badge(tag, clr)}
                        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: DIM, fontFamily: 'monospace' }}>{lc} led{lc === 1 ? '' : 's'} · {num(postsN(n))} posts</span>
                      </button>
                    </td>
                  </tr>
                );
              };
              const out = [];
              const walk = (n, depth) => {
                const lc = leafN(n); if (!lc) return;
                out.push(groupTr(n, depth, lc));
                if (closed.has(n.name) && !filtering) return;
                n.children.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach((c) => walk(c, depth + 1));
                n.ledgers.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach((l) => out.push(ledgerTr(l, depth + 1)));
              };
              roots.forEach((r) => walk(r, 0));
              if (orphans.length) {
                out.push(<tr key="G::orphans"><td colSpan={nCols} style={{ padding: '8px 12px', background: '#fbfcfe', fontWeight: 650, color: DIM, borderBottom: '1px solid #e2e8f2' }}>(Ungrouped){badge('?', GREY)}</td></tr>);
                orphans.forEach((l) => out.push(ledgerTr(l, 1)));
              }
              bodyRows = out;
            } else {
              bodyRows = items.map((l) => ledgerTr(l, 0));
            }

            return (
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: rich ? 940 : 620 }}>
              <thead><tr>
                <th style={{ ...dth, textAlign: 'left' }}>{treeMode ? 'Parent Group ▸ Group ▸ Sub-Group ▸ Ledger' : 'Ledger'}</th>
                <th style={{ ...dth, textAlign: 'left' }}>Kind</th>
                {!treeMode && <th style={{ ...dth, textAlign: 'left' }}>Group</th>}
                {rich && <th style={{ ...dth, textAlign: 'left' }}>Branches</th>}
                <th style={{ ...dth, textAlign: 'right' }}>Postings</th><th style={{ ...dth, textAlign: 'right' }}>Closing Balance</th>
              </tr></thead>
              <tbody>{bodyRows}</tbody>
              <tfoot><tr>
                <td colSpan={nCols - 2} style={{ position: 'sticky', bottom: 0, background: '#f2f7f5', borderTop: '2px solid #cdd1d8', padding: '11px 12px', fontWeight: 700 }}>{items.length} ledgers</td>
                <td style={{ position: 'sticky', bottom: 0, background: '#f2f7f5', borderTop: '2px solid #cdd1d8', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, padding: '11px 12px' }}>{num(totC)}</td>
                <td style={{ position: 'sticky', bottom: 0, background: '#f2f7f5', borderTop: '2px solid #cdd1d8', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, padding: '11px 12px', color: net >= 0 ? SIGN_CLR.fixed : SIGN_CLR.deact }}>{Math.abs(net) < 0.005 ? '0.00' : money(net, scope.branch)} {net >= 0 ? 'Dr' : 'Cr'}</td>
              </tr></tfoot>
            </table>
            );
          })()}
      </div>
    </div>
  );
}

// Back-compat alias — the route/import historically used "ChartBuilder".
export const ChartBuilder = AccountsTreeView;
