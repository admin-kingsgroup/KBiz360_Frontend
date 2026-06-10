// ─── Voucher Approvals ────────────────────────────────────────────────────────
// Approval queue for the gated voucher types (Payment, Receipt, Contra, Journal,
// Credit Note, Debit Note, Purchase Expense). Manual entries AND bulk uploads land
// here as PENDING and hit the books only when approved.
// Single nested sheet: Group › Sub-group › Ledger › Entry (collapsible).
import React, { useMemo, useState } from 'react';
import { useVoucherApprovals, useApproveVoucher, useRejectVoucher, useApproveMany, useApproveAll } from '../core/useAccounting';

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
  const q = useVoucherApprovals(branch, status);
  const d = q.data || {};
  const counts = d.counts || { pending: { n: 0, amount: 0 }, approved: { n: 0, amount: 0 }, rejected: { n: 0, amount: 0 } };
  const entries = d.entries || [];
  const approve = useApproveVoucher();
  const reject = useRejectVoucher();
  const approveMany = useApproveMany();
  const approveAll = useApproveAll();
  const busy = approve.isPending || reject.isPending || approveMany.isPending || approveAll.isPending;

  const allIds = useMemo(() => [...new Set(entries.map((e) => e.id))], [entries]);
  React.useEffect(() => { setSel(new Set()); }, [status, branch]); // clear selection on tab/branch change
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  const doApprove = (id) => approve.mutate({ id, approver: 'admin' });
  const doReject = (id) => { const reason = window.prompt('Reason for rejection?'); if (reason !== null) reject.mutate({ id, by: 'admin', reason }); };
  const doApproveSelected = () => { if (sel.size && window.confirm(`Approve ${sel.size} selected voucher(s)? They will post to the books.`)) approveMany.mutate({ ids: [...sel], approver: 'admin' }, { onSuccess: () => setSel(new Set()) }); };
  const doApproveAll = () => { if (window.confirm(`Approve all ${counts.pending.n} pending vouchers for ${branchLabel(branch)}? They will post to the books.`)) approveAll.mutate({ branch, approver: 'admin' }); };

  // Build the nested tree: Group › Sub-group › Ledger › Entries (one row per
  // posting leg, so a voucher appears under each ledger it touches).
  const { tree, allKeys } = useMemo(() => {
    const groups = {}; const allKeys = [];
    const bump = (o, p) => { o.debit += p.debit || 0; o.credit += p.credit || 0; };
    entries.forEach((e) => (e.postings || []).forEach((p) => {
      const gName = p.group || '—', sName = p.subGroup || gName, lName = p.ledger || '—';
      const g = groups[gName] || (groups[gName] = { name: gName, subs: {}, debit: 0, credit: 0 }); bump(g, p);
      const s = g.subs[sName] || (g.subs[sName] = { name: sName, ledgers: {}, debit: 0, credit: 0 }); bump(s, p);
      const l = s.ledgers[lName] || (s.ledgers[lName] = { name: lName, entries: [], debit: 0, credit: 0 }); bump(l, p);
      l.entries.push({ ...e, legDebit: p.debit || 0, legCredit: p.credit || 0, legNarration: p.narration || e.narration });
    }));
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

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Voucher Approvals</div>
          <div style={{ fontSize: 12, color: C.dim }}>{branchLabel(branch)} · Payment · Receipt · Contra · Journal · Credit/Debit Note · Purchase Expense — manual & bulk post only when approved</div>
        </div>
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
          {tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fafbfe', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: C.dim, fontWeight: 600 }}>Group › Sub-group › Ledger › Entry</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
            {status === 'pending' && allIds.length > 0 && (
              <button onClick={toggleAllSel} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.blue}`, borderRadius: 5, background: sel.size === allIds.length ? C.blue : '#fff', color: sel.size === allIds.length ? '#fff' : C.blue, cursor: 'pointer' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            )}
            <button onClick={() => setAll(true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊞ Expand all</button>
            <button onClick={() => setAll(false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊟ Collapse all</button>
          </span>
          {q.isFetching && <span style={{ fontSize: 11, color: C.dim }}>updating…</span>}
        </div>
      </div>

      <div style={{ ...card }}>
        {q.isLoading ? <div style={{ padding: 28, textAlign: 'center', color: C.dim }}>Loading…</div> : (
          <div style={{ maxHeight: '72vh', overflow: 'auto', fontSize: 12.5 }}>
            {tree.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.dim }}>No {status} vouchers.</div>}
            {tree.map((g) => {
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
                                        <td style={{ padding: '5px 8px', color: C.blue, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #f4f6fa' }}>{e.vno}</td>
                                        <td style={{ padding: '5px 8px', color: C.dim, whiteSpace: 'nowrap', borderBottom: '1px solid #f4f6fa' }}>{VCH[e.category] || e.type}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, color: C.blue, borderBottom: '1px solid #f4f6fa', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.drLedger}>{x.drLedger}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, color: C.red, borderBottom: '1px solid #f4f6fa', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.crLedger}>{x.crLedger}</td>
                                        <td style={{ padding: '5px 8px', color: C.dim, fontStyle: 'italic', borderBottom: '1px solid #f4f6fa', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.narration || e.legNarration || ''}>{e.narration || e.legNarration || '—'}{e.rejectedReason ? ` · ✗ ${e.rejectedReason}` : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.blue, borderBottom: '1px solid #f4f6fa' }}>{x.drAmt ? money(x.drAmt) : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.red, borderBottom: '1px solid #f4f6fa' }}>{x.crAmt ? money(x.crAmt) : ''}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #f4f6fa' }}>
                                          {status === 'pending' ? (
                                            <>
                                              <button onClick={() => doApprove(e.id)} disabled={busy} style={{ padding: '3px 9px', background: C.green, color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Approve</button>
                                              <button onClick={() => doReject(e.id)} disabled={busy} style={{ padding: '3px 9px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer' }}>Reject</button>
                                            </>
                                          ) : <span style={{ fontSize: 10, fontWeight: 700, color: status === 'approved' ? C.green : C.red }}>{status === 'approved' ? '✓' : '✗'}</span>}
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
    </div>
  );
}
