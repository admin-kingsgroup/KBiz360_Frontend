// ─── Chart Builder — Parent Group ▸ Group ▸ Sub-Group ▸ Ledger ───────────────
// Build the Chart of Accounts as a hierarchy: the 28 fixed Tally PARENT GROUPS,
// under each you create multiple GROUPS, under each Group multiple SUB-GROUPS, and
// LEDGERS under a Group or Sub-Group. Inline "+ Add" at every level. 3 chart tiers.
import React, { useState } from 'react';
import { useMasterList, useMasterMutations } from '../core/useMasters';

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

export function ChartBuilder() {
  const groupsQ = useMasterList('groups');
  const ledgersQ = useMasterList('ledgers');
  const subMut = useMasterMutations('subgroups');
  const ledMut = useMasterMutations('ledgers');
  const [open, setOpen] = useState({});
  const [add, setAdd] = useState(null);   // { parent, kind: 'group'|'subgroup'|'ledger' }
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const busy = subMut.create.isPending || ledMut.create.isPending;

  const groups = groupsQ.data || [];
  const ledgers = ledgersQ.data || [];
  // node map by name → children + ledgers
  const nodes = {};
  groups.forEach((g) => { nodes[g.name] = { ...g, children: [], ledgers: [] }; });
  groups.forEach((g) => { if (g.parent && nodes[g.parent]) nodes[g.parent].children.push(nodes[g.name]); });
  ledgers.forEach((l) => { const t = (l.subGroup && nodes[l.subGroup]) ? l.subGroup : l.group; if (nodes[t]) nodes[t].ledgers.push(l); });
  Object.values(nodes).forEach((n) => { n.children.sort((a, b) => a.name.localeCompare(b.name)); n.ledgers.sort((a, b) => a.name.localeCompare(b.name)); });
  const roots = groups.filter((g) => g.system).map((g) => nodes[g.name]).sort((a, b) => (TALLY_ORDER.indexOf(a.name) - TALLY_ORDER.indexOf(b.name)));

  const tog = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  const startAdd = (parent, kind) => { setAdd({ parent, kind }); setName(''); setErr(''); setOpen((s) => ({ ...s, [parent]: true })); };
  const save = async () => {
    const nm = name.trim(); if (!nm || !add) return;
    setErr('');
    try {
      if (add.kind === 'ledger') {
        const code = 'LG-' + nm.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) + '-' + Date.now().toString(36).slice(-4).toUpperCase();
        await ledMut.create.mutateAsync({ name: nm, group: add.parent, code, branch: 'ALL', currency: 'INR', openingBalance: 0 });
      } else {
        await subMut.create.mutateAsync({ name: nm, parent: add.parent });
      }
      setAdd(null); setName('');
    } catch (e) { setErr(e.message || 'Failed'); }
  };

  const Caret = ({ k, has }) => <span style={{ width: 14, display: 'inline-block', color: GOLD, cursor: has ? 'pointer' : 'default' }} onClick={() => has && tog(k)}>{has ? (open[k] ? '▾' : '▸') : ''}</span>;
  const AddBtn = (parent, kind, label, color) => <button onClick={() => startAdd(parent, kind)} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: `1px solid ${color}`, background: '#fff', color, cursor: 'pointer', marginLeft: 6 }}>+ {label}</button>;
  const addForm = (parent, kind, indent) => add && add.parent === parent && add.kind === kind && (
    <div style={{ paddingLeft: indent, padding: `4px 0 6px ${indent}px`, display: 'flex', alignItems: 'center', gap: 6 }}>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder={kind === 'ledger' ? 'New ledger name' : kind === 'subgroup' ? 'New sub-group name' : 'New group name'} style={{ padding: '5px 9px', border: '1px solid #cbd3e6', borderRadius: 6, fontSize: 12, width: 240 }} />
      <button disabled={busy} onClick={save} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', background: GREEN, color: '#fff', cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save'}</button>
      <button onClick={() => setAdd(null)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #d6dbe6', background: '#fff', color: DIM, cursor: 'pointer' }}>Cancel</button>
      {err && <span style={{ color: RED, fontSize: 11 }}>⚠ {err}</span>}
    </div>
  );
  const ledgerRow = (l, indent) => (
    <div key={'L' + l.id} style={{ display: 'flex', alignItems: 'center', padding: `4px 12px 4px ${indent}px`, fontSize: 12, borderBottom: '1px solid #f5f6fa', color: DARK }}>
      <span style={{ color: GREEN, marginRight: 6 }}>•</span>{l.name}{badge('Ledger', GREEN)}
    </div>
  );

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1050, margin: '0 auto' }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Chart Builder</h2>
      <p style={{ margin: '3px 0 14px', fontSize: 11.5, color: DIM }}>
        Build the chart top-down: <b>Parent Group</b> (28 fixed Tally) ▸ <b>Group</b> ▸ <b>Sub-Group</b> ▸ <b>Ledger</b>. Create multiple Groups under a Parent Group, multiple Sub-Groups under a Group, and multiple Ledgers under a Group or Sub-Group.
      </p>
      {(groupsQ.isLoading || ledgersQ.isLoading) && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading chart…</div>}
      <div style={{ border: '1px solid #e5e9f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        {roots.map((pg) => {
          const pgHas = pg.children.length || pg.ledgers.length;
          return (
            <div key={pg.name}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', fontWeight: 800, color: DARK }}>
                <Caret k={pg.name} has={pgHas} /><span onClick={() => pgHas && tog(pg.name)} style={{ cursor: pgHas ? 'pointer' : 'default' }}>{pg.name}</span>{badge('Parent Group', BLUE)}
                <span style={{ marginLeft: 'auto' }}>{AddBtn(pg.name, 'group', 'Add Group', BLUE)}</span>
              </div>
              {addForm(pg.name, 'group', 24)}
              {open[pg.name] && pg.children.map((grp) => {
                const grpHas = grp.children.length || grp.ledgers.length;
                return (
                  <div key={grp.name}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px 7px 26px', background: '#f6f9fd', fontWeight: 700, color: '#1a3a6e' }}>
                      <Caret k={grp.name} has={grpHas} /><span onClick={() => grpHas && tog(grp.name)} style={{ cursor: grpHas ? 'pointer' : 'default' }}>{grp.name}</span>{badge('Group', '#1a3a6e')}
                      <span style={{ marginLeft: 'auto' }}>{AddBtn(grp.name, 'subgroup', 'Add Sub-Group', '#1a3a6e')}{AddBtn(grp.name, 'ledger', 'Add Ledger', GREEN)}</span>
                    </div>
                    {addForm(grp.name, 'subgroup', 44)}
                    {addForm(grp.name, 'ledger', 44)}
                    {open[grp.name] && <>
                      {grp.children.map((sg) => {
                        const sgHas = sg.ledgers.length;
                        return (
                          <div key={sg.name}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 6px 46px', fontWeight: 600, color: DARK, borderBottom: '1px solid #f0f2f7' }}>
                              <Caret k={sg.name} has={sgHas} /><span onClick={() => sgHas && tog(sg.name)} style={{ cursor: sgHas ? 'pointer' : 'default' }}>{sg.name}</span>{badge('Sub-Group', GOLD)}
                              <span style={{ marginLeft: 'auto' }}>{AddBtn(sg.name, 'ledger', 'Add Ledger', GREEN)}</span>
                            </div>
                            {addForm(sg.name, 'ledger', 64)}
                            {open[sg.name] && sg.ledgers.map((l) => ledgerRow(l, 70))}
                          </div>
                        );
                      })}
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
    </div>
  );
}
