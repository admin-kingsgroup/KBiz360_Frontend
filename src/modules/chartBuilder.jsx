// ─── Chart Builder — Parent Group ▸ Group ▸ Sub-Group ▸ Ledger ───────────────
// Two views of the whole chart, both with a top "+ Create New":
//   • Tree View — read-only structure to understand the hierarchy (expand/collapse).
//   • Side-by-Side — Tally-style miller columns (Parent Group → Group → Sub-Group → Ledger).
// Create is a single modal (pick Group / Sub-Group / Ledger + its parent). 3 tiers.
import React, { useState } from 'react';
import { useMasterList, useMasterMutations } from '../core/useMasters';
import { branchCode } from '../core/useAccounting';

const DARK = '#0d1326', DIM = '#5a6691', BLUE = '#185FA5', RED = '#A32D2D', GREEN = '#27500A', GOLD = '#A07828';
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

export function ChartBuilder({ branch }) {
  const brc = branchCode(branch);                    // undefined for ALL → shows all
  const groupsQ = useMasterList('groups');           // groups/sub-groups are SHARED across branches
  const ledgersQ = useMasterList('ledgers', { branch: brc }); // ledgers are branch-scoped (this branch + ALL)
  const subMut = useMasterMutations('subgroups');
  const ledMut = useMasterMutations('ledgers');
  const [tab, setTab] = useState('tree');           // 'tree' | 'side'
  const [open, setOpen] = useState({});
  const [create, setCreate] = useState(null);       // { kind:'group'|'subgroup'|'ledger', parent, name }
  const [err, setErr] = useState('');
  const [sel, setSel] = useState({ pg: '', g: '', sg: '' });
  const busy = subMut.create.isPending || ledMut.create.isPending;

  const groups = groupsQ.data || [];
  // Branch-scoped ledgers (this branch + org-wide ALL). Dedup by name, preferring
  // the branch-specific copy over the ALL copy so nothing shows twice.
  const ledgers = (ledgersQ.data || []).slice().sort((a, b) => (a.branch === 'ALL' ? 1 : 0) - (b.branch === 'ALL' ? 1 : 0));
  const nodes = {};
  groups.forEach((g) => { nodes[g.name] = { ...g, children: [], ledgers: [] }; });
  groups.forEach((g) => { if (g.parent && nodes[g.parent]) nodes[g.parent].children.push(nodes[g.name]); });
  const seenLed = new Set();
  ledgers.forEach((l) => { const k = (l.name || '').toLowerCase(); if (seenLed.has(k)) return; seenLed.add(k); const t = (l.subGroup && nodes[l.subGroup]) ? l.subGroup : l.group; if (nodes[t]) nodes[t].ledgers.push(l); });
  Object.values(nodes).forEach((n) => { n.children.sort((a, b) => a.name.localeCompare(b.name)); n.ledgers.sort((a, b) => a.name.localeCompare(b.name)); });
  const roots = groups.filter((g) => g.system).map((g) => nodes[g.name]).sort((a, b) => (TALLY_ORDER.indexOf(a.name) - TALLY_ORDER.indexOf(b.name)));
  const gNames = groups.filter((g) => !g.system && nodes[g.parent] && nodes[g.parent].system).map((g) => g.name).sort();
  const sgNames = groups.filter((g) => !g.system && nodes[g.parent] && !nodes[g.parent].system).map((g) => g.name).sort();
  const allKeys = groups.map((g) => g.name);

  const tog = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  const setAll = (v) => setOpen(v ? Object.fromEntries(allKeys.map((k) => [k, true])) : {});
  const startCreate = (kind, parent = '') => { setCreate({ kind, parent, name: '' }); setErr(''); };
  const parentOpts = !create ? [] : create.kind === 'group' ? roots.map((r) => r.name) : create.kind === 'subgroup' ? gNames : [...roots.map((r) => r.name), ...gNames, ...sgNames];
  const save = async () => {
    const nm = (create.name || '').trim(); const parent = (create.parent || '').trim();
    if (!nm) { setErr('Enter a name'); return; }
    if (!parent) { setErr('Pick a parent'); return; }
    setErr('');
    try {
      if (create.kind === 'ledger') {
        const code = 'LG-' + nm.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) + '-' + Date.now().toString(36).slice(-4).toUpperCase();
        await ledMut.create.mutateAsync({ name: nm, group: parent, code, branch: 'ALL', currency: 'INR', openingBalance: 0 });
      } else {
        await subMut.create.mutateAsync({ name: nm, parent });
      }
      setCreate(null);
    } catch (e) { setErr(e.message || 'Failed'); }
  };

  const Caret = ({ k, has }) => <span style={{ width: 14, display: 'inline-block', color: GOLD, cursor: has ? 'pointer' : 'default' }} onClick={() => has && tog(k)}>{has ? (open[k] ? '▾' : '▸') : ''}</span>;
  const ledgerRow = (l, indent) => <div key={'L' + l.id} style={{ display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${indent}px`, fontSize: 12, borderBottom: '1px solid #f5f6fa', color: DARK }}><span style={{ color: GREEN, marginRight: 6 }}>•</span>{l.name}{badge('Ledger', GREEN)}</div>;

  // ── Tree view (read-only structure) ──
  const treeView = () => (
    <div style={{ border: '1px solid #e5e9f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {roots.map((pg) => {
        const pgHas = pg.children.length || pg.ledgers.length;
        return (
          <div key={pg.name}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', fontWeight: 800, color: DARK }}>
              <Caret k={pg.name} has={pgHas} /><span onClick={() => pgHas && tog(pg.name)} style={{ cursor: pgHas ? 'pointer' : 'default' }}>{pg.name}</span>{badge('Parent Group', BLUE)}
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: DIM }}>{pg.children.length} group{pg.children.length === 1 ? '' : 's'}</span>
            </div>
            {open[pg.name] && pg.children.map((grp) => {
              const grpHas = grp.children.length || grp.ledgers.length;
              return (
                <div key={grp.name}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px 7px 26px', background: '#f6f9fd', fontWeight: 700, color: '#1a3a6e' }}>
                    <Caret k={grp.name} has={grpHas} /><span onClick={() => grpHas && tog(grp.name)} style={{ cursor: grpHas ? 'pointer' : 'default' }}>{grp.name}</span>{badge('Group', '#1a3a6e')}
                  </div>
                  {open[grp.name] && <>
                    {grp.children.map((sg) => (
                      <div key={sg.name}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 46px', fontWeight: 600, color: DARK, borderBottom: '1px solid #f0f2f7' }}>
                          <Caret k={sg.name} has={sg.ledgers.length} /><span onClick={() => sg.ledgers.length && tog(sg.name)} style={{ cursor: sg.ledgers.length ? 'pointer' : 'default' }}>{sg.name}</span>{badge('Sub-Group', GOLD)}
                        </div>
                        {open[sg.name] && sg.ledgers.map((l) => ledgerRow(l, 70))}
                      </div>
                    ))}
                    {grp.ledgers.map((l) => ledgerRow(l, 52))}
                  </>}
                </div>
              );
            })}
            {open[pg.name] && pg.ledgers.map((l) => ledgerRow(l, 34))}
          </div>
        );
      })}
    </div>
  );

  // ── Side-by-Side (miller columns) ──
  const col = (title, items, selVal, onPick, kind) => (
    <div style={{ flex: 1, minWidth: 180, border: '1px solid #e5e9f0', borderRadius: 8, background: '#fff', display: 'flex', flexDirection: 'column', maxHeight: '64vh' }}>
      <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #eef1f6', background: '#f7f8fb' }}>{title} <span style={{ color: '#9aa2c0' }}>({items.length})</span></div>
      <div style={{ overflow: 'auto' }}>
        {items.map((it) => (
          <div key={it.name || it.id} onClick={() => onPick && onPick(it)} style={{ padding: '6px 10px', fontSize: 12, cursor: onPick ? 'pointer' : 'default', background: selVal === (it.name) ? '#eef3fb' : 'transparent', borderBottom: '1px solid #f5f6fa', color: kind === 'ledger' ? DARK : DARK, fontWeight: selVal === it.name ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{kind === 'ledger' ? <><span style={{ color: GREEN, marginRight: 6 }}>•</span>{it.name}</> : it.name}</span>
            {onPick && kind !== 'ledger' && <span style={{ color: '#c3cbe0' }}>›</span>}
          </div>
        ))}
        {!items.length && <div style={{ padding: 12, fontSize: 11, color: '#9aa2c0' }}>—</div>}
      </div>
    </div>
  );
  const pgNode = sel.pg && nodes[sel.pg]; const gNode = sel.g && nodes[sel.g]; const sgNode = sel.sg && nodes[sel.sg];
  const sideView = () => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {col('Parent Group (28)', roots, sel.pg, (it) => setSel({ pg: it.name, g: '', sg: '' }))}
      {col('Group', pgNode ? pgNode.children : [], sel.g, (it) => setSel((s) => ({ ...s, g: it.name, sg: '' })))}
      {col('Sub-Group', gNode ? gNode.children : [], sel.sg, (it) => setSel((s) => ({ ...s, sg: it.name })))}
      {col('Ledger', sgNode ? sgNode.ledgers : gNode ? gNode.ledgers : pgNode ? pgNode.ledgers : [], '', null, 'ledger')}
    </div>
  );

  const tabBtn = (k, l) => <button key={k} onClick={() => setTab(k)} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, border: 'none', borderBottom: `3px solid ${tab === k ? GOLD : 'transparent'}`, background: 'transparent', cursor: 'pointer', color: tab === k ? DARK : DIM }}>{l}</button>;

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Chart Builder</h2>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>Parent Group (28) ▸ Group ▸ Sub-Group ▸ Ledger · <b>{brc || 'All branches'}</b> ledgers (+ org-wide). Groups/Sub-Groups are shared across all branches.</p>
        </div>
        <button onClick={() => startCreate('group')} style={{ marginLeft: 'auto', padding: '8px 16px', background: GOLD, color: '#0d1326', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Create New</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e9f0', marginBottom: 12 }}>
        {tabBtn('tree', 'Tree View')}{tabBtn('side', 'Side-by-Side')}
        {tab === 'tree' && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, padding: '4px 0' }}>
            <button onClick={() => setAll(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊞ Expand all</button>
            <button onClick={() => setAll(false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${DARK}`, borderRadius: 5, background: '#fff', color: DARK, cursor: 'pointer' }}>⊟ Collapse all</button>
          </span>
        )}
      </div>

      {(groupsQ.isLoading || ledgersQ.isLoading) && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading chart…</div>}
      {tab === 'tree' ? treeView() : sideView()}

      {create && (
        <div onClick={() => setCreate(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: 'min(460px,96vw)', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef1f6', fontWeight: 800, color: DARK, fontSize: 15 }}>Create New</div>
            <div style={{ padding: '16px 18px', display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: DIM, marginBottom: 5 }}>What to create</div>
                <div style={{ display: 'inline-flex', border: '1px solid #d6dbe6', borderRadius: 7, overflow: 'hidden' }}>
                  {[['group', 'Group'], ['subgroup', 'Sub-Group'], ['ledger', 'Ledger']].map(([k, l]) => (
                    <button key={k} onClick={() => setCreate((c) => ({ ...c, kind: k, parent: '' }))} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: create.kind === k ? BLUE : '#fff', color: create.kind === k ? '#fff' : DIM }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: DIM, marginBottom: 5 }}>{create.kind === 'group' ? 'Under Parent Group (28)' : create.kind === 'subgroup' ? 'Under Group' : 'Under Group / Sub-Group'}</div>
                <select value={create.parent} onChange={(e) => setCreate((c) => ({ ...c, parent: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d6dbe6', borderRadius: 6, fontSize: 12.5 }}>
                  <option value="">— select —</option>
                  {parentOpts.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: DIM, marginBottom: 5 }}>{create.kind === 'ledger' ? 'Ledger name' : create.kind === 'subgroup' ? 'Sub-Group name' : 'Group name'}</div>
                <input autoFocus value={create.name} onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && save()} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d6dbe6', borderRadius: 6, fontSize: 12.5 }} />
              </div>
              {err && <div style={{ color: RED, fontSize: 11.5, fontWeight: 600 }}>⚠ {err}</div>}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #eef1f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setCreate(null)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #d6dbe6', background: '#fff', color: DIM, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={busy} onClick={save} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: GREEN, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
