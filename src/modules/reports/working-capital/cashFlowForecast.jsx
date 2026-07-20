/* ════════════════════════════════════════════════════════════════════
   13-WEEK CASH-FLOW FORECAST
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of finance/legacy.jsx —
   MENU_REPORTS ▸ Working Capital (href /reports/cashflow-forecast), not a
   Finance-menu item. finance/index.js re-exports CashFlowForecast from here
   so App.jsx's barrel import needed zero changes.

   Consolidated (All-branches) scope renders one forecast PER BRANCH, each in its
   own currency (India ₹ / Africa $) from the trial-balance `byBranch` split. Cash
   is NEVER summed across branch currencies — there is no consolidated total.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { ChevronDown } from 'lucide-react';
import { useCrud } from '../../../core/useRegisters';
import { useTrialBalance } from '../../../core/useAccounting';
import { bc, btnG, inp } from '../../../core/styles';
import { fmt } from '../../../core/format';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

const card = { background: '#fff', borderRadius: 10, border: '1px solid #cdd1d8', padding: '12px 14px' };
const openingCashOf = (rows) => (rows || []).filter((r) => /cash|bank/i.test(r.group || '')).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);

// One branch's 13-week forecast, in THAT branch's own currency (`cur`). The add form writes
// lines to `branchCode`. Money is never summed across branches — the consolidated view
// renders one of these per branch.
function BranchForecast({ branchCode, cur, openingCash, lines, create, remove, vo, heading }) {
  const blank = { date: '', kind: 'inflow', category: '', amount: '' };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const add = () => { if (!f.date || !f.amount) return; create.mutate({ branch: branchCode, date: f.date, kind: f.kind, category: f.category, amount: Number(f.amount) || 0 }, { onSuccess: () => setF(blank) }); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const wk = (d) => { const dt = new Date(d); return Math.floor((dt - today) / (7 * 86400000)); };
  const weeks = Array.from({ length: 13 }, (_, i) => ({ i, inflow: 0, outflow: 0 }));
  lines.forEach((r) => { const w = wk(r.date); if (w >= 0 && w < 13) { if (r.kind === 'inflow') weeks[w].inflow += r.amount || 0; else weeks[w].outflow += r.amount || 0; } });
  let bal = openingCash; const wrows = weeks.map((w) => { const net = w.inflow - w.outflow; bal += net; const d = new Date(today.getTime() + w.i * 7 * 86400000); return { ...w, net, bal, label: d.toISOString().slice(5, 10) }; });
  const totIn = weeks.reduce((s, w) => s + w.inflow, 0), totOut = weeks.reduce((s, w) => s + w.outflow, 0);
  const ip = { ...inp, minHeight: 30, fontSize: 11, width: '100%' };
  const kc = (label, val, col) => (<div style={{ ...card, borderTop: `3px solid ${col}` }}><p style={{ margin: 0, fontSize: 10, color: '#5a6691', textTransform: 'uppercase' }}>{label}</p><p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: col }}>{cur + fmt(val)}</p></div>);
  return (
    <div style={{ marginBottom: heading ? 22 : 0 }}>
      {heading && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 10px', borderBottom: '2px solid #d4a437', paddingBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#0d1326' }}>{heading}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9A9A9A' }}>· {cur}</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        {kc('Opening Cash', openingCash, '#185FA5')}{kc('13-wk Inflow', totIn, '#27500A')}{kc('13-wk Outflow', totOut, '#A32D2D')}{kc('Projected Close', openingCash + totIn - totOut, '#854F0B')}
      </div>
      <div style={{ ...card, marginBottom: 12 }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#0d1326' }}>Add expected cash line{heading ? ` — ${branchCode}` : ''}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, alignItems: 'center' }}>
          <input style={ip} type="date" value={f.date} onChange={set('date')} />
          <DropdownMenu
            ariaLabel="Kind"
            menuRole="listbox"
            items={[
              { key: 'inflow', label: '▲ Inflow', selected: f.kind === 'inflow', onSelect: () => setF((s) => ({ ...s, kind: 'inflow' })) },
              { key: 'outflow', label: '▼ Outflow', selected: f.kind === 'outflow', onSelect: () => setF((s) => ({ ...s, kind: 'outflow' })) },
            ]}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{ ...ip, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontWeight: 700, color: f.kind === 'inflow' ? '#27500A' : '#A32D2D', cursor: 'pointer', textAlign: 'left' }}>
                {f.kind === 'inflow' ? '▲ Inflow' : '▼ Outflow'}
                <ChevronDown size={13} style={{ color: '#5b616e', flexShrink: 0 }} />
              </button>
            )}
          />
          <input style={ip} placeholder="Category" value={f.category} onChange={set('category')} />
          <input style={ip} type="number" placeholder="Amount" value={f.amount} onChange={set('amount')} />
          <button onClick={add} disabled={create.isPending || vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...btnG, minHeight: 32, fontSize: 11, ...(vo ? { opacity: 0.5, cursor: 'not-allowed' } : null) }}>+ Add</button>
        </div>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ background: '#0d1326', color: '#d4a437' }}><tr>
              <th style={{ padding: '9px 8px', textAlign: 'left' }}>Week of</th><th style={{ padding: '9px 8px', textAlign: 'right' }}>Inflow</th><th style={{ padding: '9px 8px', textAlign: 'right' }}>Outflow</th><th style={{ padding: '9px 8px', textAlign: 'right' }}>Net</th><th style={{ padding: '9px 8px', textAlign: 'right' }}>Running Balance</th>
            </tr></thead>
            <tbody>
              {wrows.map((w) => (<tr key={w.i} style={{ borderBottom: '1px solid #cdd1d8' }}>
                <td style={{ padding: '6px 8px' }}>W{w.i + 1} ({w.label})</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#27500A' }}>{w.inflow ? cur + fmt(w.inflow) : '-'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#A32D2D' }}>{w.outflow ? cur + fmt(w.outflow) : '-'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{cur + fmt(w.net)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: w.bal < 0 ? '#A32D2D' : '#0d1326' }}>{cur + fmt(w.bal)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      {lines.length > 0 && <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead style={{ background: '#f3f4f8' }}><tr><th style={{ padding: '7px 8px', textAlign: 'left' }}>Date</th><th style={{ padding: '7px 8px', textAlign: 'left' }}>Kind</th><th style={{ padding: '7px 8px', textAlign: 'left' }}>Category</th><th style={{ padding: '7px 8px', textAlign: 'right' }}>Amount</th><th style={{ padding: '7px 8px' }}></th></tr></thead>
            <tbody>
              {lines.map((r) => (<tr key={r.id} style={{ borderBottom: '1px solid #dfe2e7' }}>
                <td style={{ padding: '6px 8px' }}>{r.date}</td><td style={{ padding: '6px 8px' }}>{r.kind}</td><td style={{ padding: '6px 8px' }}>{r.category || '-'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: r.kind === 'inflow' ? '#27500A' : '#A32D2D' }}>{cur + fmt(r.amount)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}><button onClick={() => remove.mutate(r.id)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ background: 'none', border: 'none', color: vo ? '#9aa0ac' : '#A32D2D', cursor: vo ? 'not-allowed' : 'pointer', fontWeight: 700 }}>x</button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}

export function CashFlowForecast({ branch }) {
  const brCode = branch === 'ALL' ? undefined : branch && branch.code;
  const isAll = branch === 'ALL' || !brCode;
  const { rows, create, remove } = useCrud('cashflow-forecast', brCode ? { branch: brCode } : {});
  const tb = useTrialBalance(branch, {}).data || {};
  const vo = isViewOnly();
  const byBranch = Array.isArray(tb.byBranch) ? tb.byBranch : null;

  return (
    <div style={{ padding: '12px 10px', maxWidth: 1600, margin: '0 auto' }}>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#0d1326' }}>13-Week Cash-Flow Forecast</h2>
      <p style={{ margin: '4px 0 14px', fontSize: 11.5, color: '#5a6691' }}>Opening cash is live from the books; add expected in/out lines to project the closing balance.{isAll ? ' Each branch is shown in its own currency — cash is never summed across branches.' : ''}</p>
      {isAll
        ? (byBranch && byBranch.length
            ? byBranch.map((b) => (
                b._error
                  ? <div key={b.branch} style={{ ...card, borderColor: '#f0b4b4', background: '#fff5f5', color: '#a12a2a', margin: '10px 0' }}>
                      <b>{b.branch}</b> — couldn’t load this branch’s opening cash: {b._error}. Forecast hidden so no false ₹0 is shown.
                    </div>
                  : <BranchForecast key={b.branch} branchCode={b.branch} cur={bc({ code: b.branch }).cur} openingCash={openingCashOf(b.rows)}
                      lines={(rows || []).filter((r) => (r.branch || '') === b.branch)} create={create} remove={remove} vo={vo} heading={b.branch} />
              ))
            : <div style={{ ...card, textAlign: 'center', color: '#5a6691', padding: 24 }}>No branch data yet — post entries and the forecast appears per branch, each in its own currency.</div>)
        : <BranchForecast branchCode={brCode} cur={bc(branch).cur} openingCash={openingCashOf(tb.rows)} lines={rows || []} create={create} remove={remove} vo={vo} heading={null} />}
    </div>
  );
}
