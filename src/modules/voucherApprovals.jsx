// ─── Voucher Approvals ────────────────────────────────────────────────────────
// Approval queue for the gated voucher types (Payment, Receipt, Contra, Journal,
// Credit Note, Debit Note, Purchase Expense). Manual entries AND bulk uploads land
// here as PENDING and hit the books only when approved.
// Single nested sheet: Group › Sub-group › Ledger › Entry (collapsible).
import React, { useMemo, useState, useRef } from 'react';
import { VoucherView } from './pnlTally';
import { openPrintWindow } from '../core/voucher-print';
import { useVoucherApprovals, useApproveVoucher, useRejectVoucher, useDeleteVoucher, useApproveMany, useApproveAll } from '../core/useAccounting';
import { VoucherEditor } from './accountingLive';
import { BookingApprovals } from './bookingOrder';
import { bc } from '../core/styles';
import { PeriodBar, periodRange } from '../core/period';

// Full rupee amount with Indian grouping — NO Cr/L abbreviation.
const money = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#e1e3ec' };
const VCH = { payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal', 'credit-note': 'Credit Note', 'debit-note': 'Debit Note', 'purchase-expense': 'Purchase Expense' };
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const branchLabel = (b) => (!b || b === 'ALL' ? 'All branches' : (b.code || b));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Dates arrive mixed (ISO "2026-01-07" and "07-01-2026") — normalise to "07 Jan 2026".
const fmtDate = (s) => {
  if (!s) return '';
  const str = String(s);
  let iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let dmy = str.match(/^(\d{2})-(\d{2})-(\d{4})/);
  let dd, mm, yy;
  if (iso) { yy = iso[1]; mm = +iso[2]; dd = iso[3]; }
  else if (dmy) { dd = dmy[1]; mm = +dmy[2]; yy = dmy[3]; }
  else return str;
  return `${dd} ${MON[mm - 1] || mm} ${yy}`;
};
// Voucher double-entry summary from its postings.
const drCrOf = (e) => {
  const dr = (e.postings || []).filter((p) => (p.debit || 0) > 0);
  const cr = (e.postings || []).filter((p) => (p.credit || 0) > 0);
  const name = (legs) => (legs.length ? legs[0].ledger + (legs.length > 1 ? ` (+${legs.length - 1})` : '') : '—');
  return { drLedger: name(dr), crLedger: name(cr), drAmt: dr.reduce((s, p) => s + (p.debit || 0), 0), crAmt: cr.reduce((s, p) => s + (p.credit || 0), 0) };
};

export function VoucherApprovals({ branch }) {
  const [status, setStatus] = useState('pending');
  const [open, setOpen] = useState({});
  const [sel, setSel] = useState(() => new Set()); // selected voucher ids (multi-approve)
  const [editId, setEditId] = useState(null);      // voucher being edited (fix → approve)
  const [viewId, setViewId] = useState(null);      // voucher being viewed (read-only formatted view)
  const viewRef = useRef(null);
  const [view, setView] = useState('tree');        // entry | voucher | tree (Group-Subgroup-Ledger)
  const cur = (bc(branch) || {}).cur || '₹';
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All so Pending shows everything
  const q = useVoucherApprovals(branch, status, { from: range.from, to: range.to });
  const d = q.data || {};
  const counts = d.counts || { pending: { n: 0, amount: 0 }, approved: { n: 0, amount: 0 }, rejected: { n: 0, amount: 0 }, deleted: { n: 0, amount: 0 } };
  const entries = d.entries || [];
  const approve = useApproveVoucher();
  const reject = useRejectVoucher();
  const del = useDeleteVoucher();
  const approveMany = useApproveMany();
  const approveAll = useApproveAll();
  const busy = approve.isPending || reject.isPending || del.isPending || approveMany.isPending || approveAll.isPending;

  const allIds = useMemo(() => [...new Set(entries.map((e) => e.id))], [entries]);
  React.useEffect(() => { setSel(new Set()); }, [status, branch]); // clear selection on tab/branch change
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  const doApprove = (id) => approve.mutate({ id, approver: 'admin' });
  const doReject = (id) => { const reason = window.prompt('Reason for rejection?'); if (reason !== null) reject.mutate({ id, by: 'admin', reason }); };
  const doDelete = (id) => { const reason = window.prompt('Delete this voucher? It will be reversed out of the books and kept view-only (number not reusable). Reason:'); if (reason !== null) del.mutate({ id, by: 'admin', reason }); };
  const doApproveSelected = () => { if (sel.size && window.confirm(`Approve ${sel.size} selected voucher(s)? They will post to the books.`)) approveMany.mutate({ ids: [...sel], approver: 'admin' }, { onSuccess: () => setSel(new Set()) }); };
  const doApproveAll = () => { if (window.confirm(`Approve all ${counts.pending.n} pending vouchers for ${branchLabel(branch)}? They will post to the books.`)) approveAll.mutate({ branch, approver: 'admin' }); };

  // Build the nested tree: Group › Sub-group › Ledger › Entries (one row per
  // posting leg, so a voucher appears under each ledger it touches).
  const { tree, allKeys } = useMemo(() => {
    const groups = {}; const allKeys = [];
    const bump = (o, p) => { o.debit += p.debit || 0; o.credit += p.credit || 0; };
    entries.forEach((e) => {
      // Entries that can't build a posting (e.g. don't balance) still surface here,
      // under a "Needs attention" node, so they can be reviewed/rejected (not hidden).
      const pts = (e.postings && e.postings.length) ? e.postings
        : [{ group: '⚠ Needs attention', subGroup: 'Cannot post — review / fix import / reject', ledger: e.party || '—', debit: 0, credit: 0 }];
      pts.forEach((p) => {
        const gName = p.group || '—', sName = p.subGroup || gName, lName = p.ledger || '—';
        const g = groups[gName] || (groups[gName] = { name: gName, subs: {}, debit: 0, credit: 0 }); bump(g, p);
        const s = g.subs[sName] || (g.subs[sName] = { name: sName, ledgers: {}, debit: 0, credit: 0 }); bump(s, p);
        const l = s.ledgers[lName] || (s.ledgers[lName] = { name: lName, entries: [], debit: 0, credit: 0 }); bump(l, p);
        l.entries.push({ ...e, legDebit: p.debit || 0, legCredit: p.credit || 0, legNarration: p.narration || e.narration });
      });
    });
    const out = Object.values(groups).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)).map((g) => {
      allKeys.push('g:' + g.name);
      const subs = Object.values(g.subs).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)).map((s) => {
        allKeys.push('s:' + g.name + '/' + s.name);
        const ledgers = Object.values(s.ledgers).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)).map((l) => {
          allKeys.push('l:' + g.name + '/' + s.name + '/' + l.name);
          return { ...l, entries: l.entries.sort((x, y) => String(x.date).localeCompare(String(y.date))) };
        });
        return { ...s, ledgers };
      });
      return { ...g, subs };
    });
    return { tree: out, allKeys };
  }, [entries]);

  const isOpen = (k, def) => (open[k] === undefined ? def : open[k]);
  const toggle = (k, def) => setOpen((s) => ({ ...s, [k]: !(s[k] === undefined ? def : s[k]) }));
  const setAll = (v) => setOpen(Object.fromEntries(allKeys.map((k) => [k, v])));

  const tab = (k, label) => (
    <button key={k} onClick={() => setStatus(k)} style={{ padding: '8px 16px', border: 'none', borderBottom: `3px solid ${status === k ? C.gold : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? C.dark : C.dim }}>
      {label} <span style={{ fontSize: 11, color: C.dim }}>({counts[k]?.n || 0} · {money(counts[k]?.amount || 0)})</span>
    </button>
  );
  const amt = (dr, cr) => (dr ? <span style={{ color: C.blue }}>{money(dr)} Dr</span> : cr ? <span style={{ color: C.red }}>{money(cr)} Cr</span> : '');
  const Caret = ({ o }) => <span style={{ color: C.gold, width: 12, display: 'inline-block' }}>{o ? '▾' : '▸'}</span>;

  // ── Shared bits for the flat (Entry wise / Voucher wise) tables ──────────────
  const flatEntries = useMemo(() => [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date))), [entries]);
  const flatTh = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `2px solid ${C.border}`, position: 'sticky', top: 0, background: '#f3f6fb', whiteSpace: 'nowrap' };
  const flatTd = { padding: '6px 10px', borderBottom: '1px solid #f4f6fa', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' };
  const ABTN = (col, filled) => ({ padding: '3px 9px', background: filled ? col : '#fff', color: filled ? '#fff' : col, border: filled ? 'none' : `1px solid ${col}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 });
  const ckbox = (e) => (status === 'pending' ? <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggleSel(e.id)} onClick={(ev) => ev.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} /> : null);
  const actionCell = (e) => (
    status === 'pending' ? (
      <>
        <button onClick={() => setEditId(e.id)} disabled={busy} style={ABTN(C.blue)}>Edit</button>
        <button onClick={() => doApprove(e.id)} disabled={busy || !e.postable} title={e.postable ? '' : 'Fix the error (Edit) before approving'} style={{ ...ABTN(C.green, true), background: e.postable ? C.green : '#cfd6e4', cursor: e.postable ? 'pointer' : 'not-allowed' }}>Approve</button>
        <button onClick={() => doReject(e.id)} disabled={busy} style={ABTN(C.red)}>Reject</button>
      </>
    ) : status === 'approved' ? (
      <button onClick={() => doDelete(e.id)} disabled={busy} title="Reverse out of the books → view-only (number not reusable)" style={ABTN(C.red)}>Delete</button>
    ) : status === 'deleted' ? (
      <span title={e.deletedReason || ''} style={{ fontSize: 10, fontWeight: 700, color: C.dim }}>🗑 {e.deletedBy || 'deleted'}</span>
    ) : <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>✗ rejected</span>
  );
  const vnoCell = (e, show = true) => <td onClick={() => show && setViewId(e.id)} title={show ? 'View full voucher' : ''} style={{ ...flatTd, color: C.blue, fontWeight: 700, cursor: show ? 'pointer' : 'default', textDecoration: show ? 'underline' : 'none' }}>{show ? e.vno : ''}</td>;

  // Voucher wise — one row per voucher (Dr/Cr summary).
  const voucherWise = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead><tr>{['Date', 'Vch No', 'Type', 'Party', 'Debit Ledger', 'Credit Ledger', 'Debit', 'Credit', 'Narration', 'Action'].map((h) => <th key={h} style={{ ...flatTh, textAlign: h === 'Debit' || h === 'Credit' ? 'right' : h === 'Action' ? 'center' : 'left' }}>{h}</th>)}</tr></thead>
      <tbody>
        {flatEntries.map((e, i) => { const x = drCrOf(e); return (
          <tr key={e.id} style={{ background: i % 2 ? '#fcfdff' : '#fff' }}>
            <td style={{ ...flatTd, color: C.dim }}>{ckbox(e)}{fmtDate(e.date)}</td>
            {vnoCell(e)}
            <td style={{ ...flatTd, color: C.dim }}>{VCH[e.category] || e.type}</td>
            <td style={flatTd} title={e.party}>{e.party || '—'}</td>
            <td style={{ ...flatTd, color: C.blue, fontWeight: 600 }} title={x.drLedger}>{x.drLedger}</td>
            <td style={{ ...flatTd, color: C.red, fontWeight: 600 }} title={x.crLedger}>{x.crLedger}</td>
            <td style={{ ...flatTd, textAlign: 'right', color: C.blue }}>{x.drAmt ? money(x.drAmt) : ''}</td>
            <td style={{ ...flatTd, textAlign: 'right', color: C.red }}>{x.crAmt ? money(x.crAmt) : ''}</td>
            <td style={{ ...flatTd, color: e.error ? C.red : C.dim, fontStyle: 'italic' }} title={e.error || e.narration || ''}>{e.error ? `⚠ ${e.error}` : (e.narration || '—')}</td>
            <td style={{ ...flatTd, textAlign: 'center' }}>{actionCell(e)}</td>
          </tr>
        ); })}
      </tbody>
    </table>
  );

  // Entry wise — one row per Dr/Cr posting leg (grouped under its voucher).
  const entryWise = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead><tr>{['Date', 'Vch No', 'Type', 'Ledger', 'Group', 'Sub-group', 'Debit', 'Credit', 'Narration', 'Action'].map((h) => <th key={h} style={{ ...flatTh, textAlign: h === 'Debit' || h === 'Credit' ? 'right' : h === 'Action' ? 'center' : 'left' }}>{h}</th>)}</tr></thead>
      <tbody>
        {flatEntries.flatMap((e) => {
          const legs = (e.postable && e.postings && e.postings.length) ? e.postings : [{ ledger: e.party || '—', group: '⚠ Needs attention', subGroup: '', debit: 0, credit: 0, narration: e.error || '' }];
          return legs.map((p, li) => (
            <tr key={e.id + ':' + li} style={{ background: '#fff', borderTop: li === 0 ? '1px solid #eef1f6' : 'none' }}>
              <td style={{ ...flatTd, color: C.dim }}>{li === 0 ? <>{ckbox(e)}{fmtDate(e.date)}</> : ''}</td>
              {li === 0 ? vnoCell(e) : <td style={flatTd}></td>}
              <td style={{ ...flatTd, color: C.dim }}>{li === 0 ? (VCH[e.category] || e.type) : ''}</td>
              <td style={{ ...flatTd, fontWeight: 600, color: C.dark }} title={p.ledger}>{p.ledger}</td>
              <td style={{ ...flatTd, color: C.dim }} title={p.group}>{p.group}</td>
              <td style={{ ...flatTd, color: C.dim }} title={p.subGroup || p.group}>{p.subGroup || p.group}</td>
              <td style={{ ...flatTd, textAlign: 'right', color: C.blue }}>{p.debit ? money(p.debit) : ''}</td>
              <td style={{ ...flatTd, textAlign: 'right', color: C.red }}>{p.credit ? money(p.credit) : ''}</td>
              <td style={{ ...flatTd, color: C.dim, fontStyle: 'italic' }} title={p.narration || e.narration || ''}>{p.narration || (li === 0 ? (e.error ? `⚠ ${e.error}` : e.narration) : '') || ''}</td>
              <td style={{ ...flatTd, textAlign: 'center' }}>{li === 0 ? actionCell(e) : ''}</td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  );

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Voucher Approvals</div>
          <div style={{ fontSize: 12, color: C.dim }}>{branchLabel(branch)} · Payment · Receipt · Contra · Journal · Credit/Debit Note · Purchase Expense — manual & bulk post only when approved</div>
        </div>
        <PeriodBar branch={branch} compact defaultPreset="all" onChange={setRange} />
        {status === 'pending' && counts.pending.n > 0 && (
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
            {sel.size > 0 && (
              <button onClick={doApproveSelected} disabled={busy} style={{ padding: '8px 16px', background: C.blue, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                ✓ Approve selected ({sel.size})
              </button>
            )}
            <button onClick={doApproveAll} disabled={busy} style={{ padding: '8px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              ✓ Approve all {counts.pending.n} pending
            </button>
          </div>
        )}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          {tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}{tab('deleted', 'Deleted')}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fafbfe', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: '1px solid #d8dcec', borderRadius: 7, overflow: 'hidden' }}>
            {[['entry', 'Entry wise'], ['voucher', 'Voucher wise'], ['tree', 'Group-Subgroup-Ledger']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: view === v ? C.blue : '#fff', color: view === v ? '#fff' : C.dim }}>{l}</button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
            {status === 'pending' && allIds.length > 0 && (
              <button onClick={toggleAllSel} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.blue}`, borderRadius: 5, background: sel.size === allIds.length ? C.blue : '#fff', color: sel.size === allIds.length ? '#fff' : C.blue, cursor: 'pointer' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            )}
            {view === 'tree' && <>
              <button onClick={() => setAll(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊞ Expand all</button>
              <button onClick={() => setAll(false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊟ Collapse all</button>
            </>}
          </span>
          {q.isFetching && <span style={{ fontSize: 11, color: C.dim }}>updating…</span>}
        </div>
      </div>

      <div style={{ ...card }}>
        {q.isLoading ? <div style={{ padding: 28, textAlign: 'center', color: C.dim }}>Loading…</div> : (
          <div style={{ maxHeight: '72vh', overflow: 'auto', fontSize: 12.5 }}>
            {flatEntries.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.dim }}>No {status} vouchers.</div>}
            {flatEntries.length > 0 && view === 'voucher' && voucherWise()}
            {flatEntries.length > 0 && view === 'entry' && entryWise()}
            {view === 'tree' && tree.map((g) => {
              const gk = 'g:' + g.name, gOpen = isOpen(gk, true);
              return (
                <div key={gk}>
                  <div onClick={() => toggle(gk, true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', cursor: 'pointer', fontWeight: 800, color: C.dark }}>
                    <Caret o={gOpen} /><span style={{ textDecoration: 'underline' }}>{g.name}</span>
                    <span style={{ marginLeft: 'auto', ...num }}>{amt(g.debit, g.credit)}</span>
                  </div>
                  {gOpen && g.subs.map((s) => {
                    const sk = 's:' + g.name + '/' + s.name, sOpen = isOpen(sk, true);
                    return (
                      <div key={sk}>
                        <div onClick={() => toggle(sk, true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 28px', background: '#f6f9fd', cursor: 'pointer', fontWeight: 700, color: '#1a3a6e' }}>
                          <Caret o={sOpen} />{s.name}{s.name !== g.name ? <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#e7eef9', color: C.dim, fontWeight: 700 }}>sub-group</span> : null}
                          <span style={{ marginLeft: 'auto', ...num }}>{amt(s.debit, s.credit)}</span>
                        </div>
                        {sOpen && s.ledgers.map((l) => {
                          const lk = 'l:' + g.name + '/' + s.name + '/' + l.name, lOpen = isOpen(lk, false);
                          return (
                            <div key={lk}>
                              <div onClick={() => toggle(lk, false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 46px', borderBottom: '1px solid #f0f2f7', cursor: 'pointer', fontWeight: 600, color: C.dark }}>
                                <Caret o={lOpen} />{l.name}
                                <span style={{ color: C.dim, fontWeight: 400, fontSize: 11 }}>· {l.entries.length} entr{l.entries.length === 1 ? 'y' : 'ies'}</span>
                                <span style={{ marginLeft: 'auto', ...num }}>{amt(l.debit, l.credit)}</span>
                              </div>
                              {lOpen && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead><tr style={{ background: '#f3f6fb' }}>
                                    {[['Date', 'left', 64], ['Vch No', 'left', 8], ['Type', 'left', 8], ['Debit Ledger', 'left', 8], ['Credit Ledger', 'left', 8], ['Narration', 'left', 8], ['Debit', 'right', 8], ['Credit', 'right', 8], ['Action', 'center', 8]].map(([h, a, pl]) => (
                                      <th key={h} style={{ padding: `4px 8px 4px ${pl}px`, textAlign: a, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                    ))}
                                  </tr></thead>
                                  <tbody>
                                    {l.entries.map((e, i) => {
                                      const x = drCrOf(e);
                                      return (
                                      <tr key={e.id + ':' + i} style={{ background: i % 2 ? '#fcfdff' : '#fff' }}>
                                        <td style={{ padding: '5px 8px 5px 44px', whiteSpace: 'nowrap', color: C.dim, borderBottom: '1px solid #f4f6fa' }}>{status === 'pending' && <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggleSel(e.id)} onClick={(ev) => ev.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} />}{fmtDate(e.date)}</td>
                                        <td onClick={() => setViewId(e.id)} title="View full voucher" style={{ padding: '5px 8px', color: C.blue, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1px solid #f4f6fa', cursor: 'pointer', textDecoration: 'underline' }}>{e.vno}</td>
                                        <td style={{ padding: '5px 8px', color: C.dim, whiteSpace: 'nowrap', borderBottom: '1px solid #f4f6fa' }}>{VCH[e.category] || e.type}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, color: C.blue, borderBottom: '1px solid #f4f6fa', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.drLedger}>{x.drLedger}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, color: C.red, borderBottom: '1px solid #f4f6fa', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.crLedger}>{x.crLedger}</td>
                                        <td style={{ padding: '5px 8px', color: e.error ? C.red : C.dim, fontStyle: 'italic', borderBottom: '1px solid #f4f6fa', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.error || e.narration || e.legNarration || ''}>{e.error ? `⚠ ${e.error}` : (e.narration || e.legNarration || '—')}{e.rejectedReason ? ` · ✗ ${e.rejectedReason}` : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.blue, borderBottom: '1px solid #f4f6fa' }}>{x.drAmt ? money(x.drAmt) : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.red, borderBottom: '1px solid #f4f6fa' }}>{x.crAmt ? money(x.crAmt) : ''}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #f4f6fa' }}>
                                          {status === 'pending' ? (
                                            <>
                                              <button onClick={() => setEditId(e.id)} disabled={busy} style={{ padding: '3px 9px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Edit</button>
                                              <button onClick={() => doApprove(e.id)} disabled={busy || !e.postable} title={e.postable ? '' : 'Fix the error (Edit) before approving'} style={{ padding: '3px 9px', background: e.postable ? C.green : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: e.postable ? 'pointer' : 'not-allowed', marginRight: 5 }}>Approve</button>
                                              <button onClick={() => doReject(e.id)} disabled={busy} style={{ padding: '3px 9px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer' }}>Reject</button>
                                            </>
                                          ) : status === 'approved' ? (
                                            <button onClick={() => doDelete(e.id)} disabled={busy} title="Reverse out of the books → view-only (number not reusable)" style={{ padding: '3px 9px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer' }}>Delete</button>
                                          ) : status === 'deleted' ? (
                                            <span title={e.deletedReason || ''} style={{ fontSize: 10, fontWeight: 700, color: C.dim }}>🗑 {e.deletedBy || 'deleted'}</span>
                                          ) : <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>✗ rejected</span>}
                                        </td>
                                      </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {(approve.isError || reject.isError || approveAll.isError) && <div style={{ marginTop: 8, color: C.red, fontSize: 12 }}>⚠ {(approve.error || reject.error || approveAll.error)?.message}</div>}

      {viewId && (
        <div onClick={() => setViewId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', width: 'min(760px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
              <strong style={{ color: C.dark }}>Voucher View</strong>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => openPrintWindow(branch, (entries.find((e) => e.id === viewId) || {}).vno || '', 'Voucher', viewRef.current)} style={{ padding: '5px 11px', background: C.dark, color: C.gold, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>🖨 Print / PDF</button>
                <button onClick={() => setViewId(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim }}>✕</button>
              </span>
            </div>
            <div ref={viewRef}><VoucherView id={viewId} cur={cur} /></div>
          </div>
        </div>
      )}
      {editId && (
        <div onClick={() => setEditId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
              <strong style={{ color: C.dark }}>Edit Voucher — fix &amp; approve</strong>
              <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim }}>✕</button>
            </div>
            <div style={{ padding: 4 }}>
              <VoucherEditor voucherId={editId} cur={cur} onBack={() => setEditId(null)} />
            </div>
            <div style={{ padding: '8px 16px', fontSize: 11, color: C.dim, borderTop: `1px solid ${C.border}` }}>Tip: set Subtotal + GST so the total balances, Save, then click Approve on the row.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unified Approvals ────────────────────────────────────────────────────────
// One screen for ALL approvals: a top toggle switches between SO/PO/GP bookings
// and Vouchers; each shows Pending · Approved · Rejected · Deleted.
export function UnifiedApprovals({ branch, setRoute, currentUser, initialDomain = 'sopogp' }) {
  const [domain, setDomain] = useState(initialDomain);
  const seg = (k, label) => (
    <button key={k} onClick={() => setDomain(k)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 800, border: `1px solid ${domain === k ? C.dark : '#d6dbe6'}`, background: domain === k ? C.dark : '#fff', color: domain === k ? C.gold : C.dim, cursor: 'pointer' }}>{label}</button>
  );
  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
        {seg('sopogp', 'SO / PO / GP')}{seg('vouchers', 'Vouchers')}
      </div>
      {domain === 'sopogp'
        ? <BookingApprovals branch={branch} setRoute={setRoute} currentUser={currentUser} />
        : <VoucherApprovals branch={branch} />}
    </div>
  );
}
