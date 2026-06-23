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
import { branchCode } from '../core/useAccounting';
import { FocusBanner } from '../core/ux/FocusBanner';
import { useNavFocusStore } from '../core/ux/navFocus';
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
  const ledgersQ = useMasterList('ledgers', branchView === 'ALL' ? {} : { branch: branchView });
  const [tab, setTab] = useState('tree');           // 'tree' | 'side'
  const [open, setOpen] = useState({});
  const [sel, setSel] = useState({ pg: '', g: '', sg: '' });

  const groups = groupsQ.data || [];

  // ── Resolve which ledgers to display, per the Branch view + Scope filter ──
  // Group raw ledgers by name so we can detect a branch copy that OVERRIDES a
  // Common ('ALL') one of the same name (Tally shows only the effective ledger).
  const byName = new Map();
  (ledgersQ.data || []).forEach((l) => { const k = (l.name || '').toLowerCase(); (byName.get(k) || byName.set(k, []).get(k)).push(l); });
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
  Object.values(nodes).forEach((n) => { n.children.sort((a, b) => a.name.localeCompare(b.name)); n.ledgers.sort((a, b) => a.name.localeCompare(b.name)); });
  const roots = groups.filter((g) => g.system).map((g) => nodes[g.name]).sort((a, b) => (TALLY_ORDER.indexOf(a.name) - TALLY_ORDER.indexOf(b.name)));
  const allKeys = groups.map((g) => g.name);

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

  const Caret = ({ k, has }) => <span style={{ width: 14, display: 'inline-block', color: GOLD, cursor: has ? 'pointer' : 'default' }} onClick={() => has && tog(k)}>{has ? (open[k] ? '▾' : '▸') : ''}</span>;
  const ledgerRow = (l, indent) => (
    <div key={'L' + l.id} id={'led-' + l.id} style={{ display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${indent}px`, fontSize: 12, borderBottom: '1px solid #f5f6fa', color: DARK, background: fLower && (l.name || '').toLowerCase() === fLower ? '#FFF6D6' : undefined }}>
      <span style={{ color: GREEN, marginRight: 6 }}>•</span>{l.name}{scopeBadge(l)}
      {l._overrides && <span style={{ fontSize: 9, color: GOLD, marginLeft: 6, fontStyle: 'italic' }}>overrides Common</span>}
    </div>
  );
  // Subheading shown above ledgers that hang straight off a Group/Parent Group
  // (no intermediate sub-group) — only when that node also has child groups, so
  // it's clear these ledgers aren't nested under one of those groups.
  const directLabel = (indent) => <div style={{ padding: `4px 12px 3px ${indent}px`, fontSize: 9.5, fontWeight: 700, color: '#9aa2c0', textTransform: 'uppercase', letterSpacing: 0.4, fontStyle: 'italic', background: '#fbfcfe', borderBottom: '1px dashed #eef1f6' }}>— ledgers directly here (no sub-group) —</div>;

  // ── Tree view (read-only structure) ──
  const treeView = () => (
    <div style={{ border: '1px solid #e6e8ec', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {roots.map((pg) => {
        const pgHas = pg.children.length || pg.ledgers.length;
        return (
          <div key={pg.name}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', fontWeight: 800, color: DARK }}>
              <Caret k={pg.name} has={pgHas} /><span onClick={() => pgHas && tog(pg.name)} style={{ cursor: pgHas ? 'pointer' : 'default' }}>{pg.name}</span>{badge('Parent Group', BLUE)}
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: DIM }}>{pg.children.length} group{pg.children.length === 1 ? '' : 's'}{pg.ledgers.length ? ` · ${countNote(pg.ledgers)}` : ''}</span>
            </div>
            {open[pg.name] && pg.children.map((grp) => {
              const grpHas = grp.children.length || grp.ledgers.length;
              return (
                <div key={grp.name}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px 7px 26px', background: '#f6f9fd', fontWeight: 700, color: '#1a3a6e' }}>
                    <Caret k={grp.name} has={grpHas} /><span onClick={() => grpHas && tog(grp.name)} style={{ cursor: grpHas ? 'pointer' : 'default' }}>{grp.name}</span>{badge('Group', '#1a3a6e')}
                    {grp.ledgers.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: DIM }}>{countNote(grp.ledgers)}</span>}
                  </div>
                  {open[grp.name] && <>
                    {grp.children.map((sg) => (
                      <div key={sg.name}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 46px', fontWeight: 600, color: DARK, borderBottom: '1px solid #f0f2f7' }}>
                          <Caret k={sg.name} has={sg.ledgers.length} /><span onClick={() => sg.ledgers.length && tog(sg.name)} style={{ cursor: sg.ledgers.length ? 'pointer' : 'default' }}>{sg.name}</span>{badge('Sub-Group', GOLD)}
                          {sg.ledgers.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 10, color: DIM }}>{countNote(sg.ledgers)}</span>}
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
    <div style={{ flex: 1, minWidth: 180, border: '1px solid #e6e8ec', borderRadius: 8, background: '#fff', display: 'flex', flexDirection: 'column', maxHeight: '64vh' }}>
      <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #eef1f6', background: '#f7f8fb' }}>{title} <span style={{ color: '#9aa2c0' }}>({items.length})</span></div>
      <div style={{ overflow: 'auto' }}>
        {items.map((it) => (
          <div key={it.name || it.id} onClick={() => onPick && onPick(it)} style={{ padding: '6px 10px', fontSize: 12, cursor: onPick ? 'pointer' : 'default', background: selVal === (it.name) ? '#eef3fb' : 'transparent', borderBottom: '1px solid #f5f6fa', color: DARK, fontWeight: selVal === it.name ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{kind === 'ledger' ? <><span style={{ color: GREEN, marginRight: 6 }}>•</span>{it.name}{scopeBadge(it)}</> : it.name}</span>
            {onPick && kind !== 'ledger' && <span style={{ color: '#c3cbe0' }}>›</span>}
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
      {col('Parent Group (28)', roots, pgName, (it) => setSel({ pg: it.name, g: '', sg: '' }))}
      {col('Group', pgNode ? pgNode.children : [], gName, (it) => setSel((s) => ({ ...s, g: it.name, sg: '' })))}
      {col('Sub-Group', gNode ? gNode.children : [], sgName, (it) => setSel((s) => ({ ...s, sg: it.name })))}
      {col('Ledger', sgNode ? sgNode.ledgers : gNode ? gNode.ledgers : pgNode ? pgNode.ledgers : [], '', null, 'ledger')}
    </div>
  );

  const tabBtn = (k, l) => <button key={k} onClick={() => setTab(k)} className="max-tablet:min-h-[44px]" style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: `3px solid ${tab === k ? GOLD : 'transparent'}`, background: 'transparent', cursor: 'pointer', color: tab === k ? DARK : DIM }}>{l}</button>;
  const scopePill = (k, l) => <button key={k} onClick={() => setScope(k)} className="max-tablet:min-h-[44px]" style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: scope === k ? BLUE : '#fff', color: scope === k ? '#fff' : DIM }}>{l}</button>;

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1100, margin: '0 auto' }}>
      <FocusBanner />
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Accounts Tree View</h2>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>Parent Group (28) ▸ Group ▸ Sub-Group ▸ Ledger · View-only — create under <b>Masters ▸ Accounts Master</b>.</p>
      </div>

      {/* Scope legend — Groups/Sub-Groups are org-wide; only Ledgers carry a branch. */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#f7f9fc', border: '1px solid #e6e8ec', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11.5, color: DIM }}>
        <span><b style={{ color: DARK }}>Groups & Sub-Groups</b> are shared across all branches (org-wide). Only <b style={{ color: DARK }}>Ledgers</b> are branch-scoped:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{badge('Common', GREY)}<span style={{ marginLeft: 4 }}>= shared by every branch (ALL)</span></span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{badge('BOM', BLUE)}<span style={{ marginLeft: 4 }}>= specific to that branch</span></span>
      </div>

      {/* Controls: in-page Branch view + Ledger Scope filter */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM }}>
          Branch view
          <select value={branchView} onChange={(e) => setBranchView(e.target.value)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d6dbe6', fontSize: 12, minWidth: 150 }}>
            <option value="ALL">{CONSOLIDATED_LABEL}</option>
            {BRANCH_CODES.map((b) => <option key={b} value={b}>{b} + Common</option>)}
          </select>
        </label>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM }}>
          Ledger scope
          <span style={{ display: 'inline-flex', border: '1px solid #d6dbe6', borderRadius: 7, overflow: 'hidden' }}>
            {scopePill('all', 'All')}{scopePill('common', 'Common only')}{scopePill('branch', 'Branch-specific only')}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: DIM }}>
          28 parent groups · <b style={{ color: DARK }}>{subGroupCount}</b> sub-groups <span style={{ color: '#9aa2c0' }}>(org-wide)</span> · <b style={{ color: DARK }}>{display.length}</b> ledgers (<b style={{ color: GREY }}>{commonCount}</b> common + <b style={{ color: BLUE }}>{branchCount}</b> branch)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e6e8ec', marginBottom: 12 }}>
        {tabBtn('tree', 'Tree View')}{tabBtn('side', 'Side-by-Side')}
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
      {tab === 'tree' ? treeView() : sideView()}
    </div>
  );
}

// Back-compat alias — the route/import historically used "ChartBuilder".
export const ChartBuilder = AccountsTreeView;
