/* ════════════════════════════════════════════════════════════════════
   COLLECTIONS FOLLOW-UP (DUNNING WORKSPACE)  /accounts/collections
   Real collections workspace: live overdue receivables (from the ageing
   engine) merged with persisted follow-up state — status, promise-to-pay,
   contact log, reminder count and dunning level. Batch "Send reminders"
   logs a dunning run.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_ACCOUNTS ▸ Receivables &
   Clients ▸ "Collections Follow-up").
   ════════════════════════════════════════════════════════════════════ */
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ReceiptText } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useCollectionsBoard, useUpsertFollowup, useAddContact, useReminderRun } from '../../../core/useCollections';
import { C, money, brLabel, Shell, th, td, rnum, Table, aBtn, card } from '../../accountantWorkspace/shared';
import { isViewOnly, VIEW_ONLY_REASON } from '../../../shell/primitives';

const AGE_COLS = [['d0', '0–30'], ['d30', '31–60'], ['d60', '61–90'], ['d90', '90+']];

// ════════════════════════ 3) COLLECTIONS FOLLOW-UP (DUNNING WORKSPACE) ═════════
// Real collections workspace: live overdue receivables (from the ageing engine)
// merged with persisted follow-up state — status, promise-to-pay, contact log,
// reminder count and dunning level. Batch "Send reminders" logs a dunning run.
const DUN_STATUS = ['open', 'promised', 'escalated', 'closed'];
const STATUS_C = { open: C.dim, promised: C.green, escalated: C.red, closed: C.blue };
const dunBadge = (s) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 800, color: '#fff', background: STATUS_C[s] || C.dim, textTransform: 'capitalize' });
const fmtWhen = (d) => (d ? String(d).slice(0, 10) : '');

// Custom status picker — a native <select>'s dropdown can't be themed (square
// corners, OS-default option rows), so this renders the same DUN_STATUS choices
// as a small rounded popover with colour-dot options instead.
function StatusMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => !disabled && setOpen((o) => !o)} disabled={disabled}
        title={disabled ? VIEW_ONLY_REASON : undefined}
        style={{ ...dunBadge(value), border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, ...(disabled ? { background: '#cfd6e4', color: '#6b7280' } : {}) }}>
        {value}
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: 130,
          background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
          boxShadow: '0 10px 28px rgba(13,19,38,0.16)', padding: 5, overflow: 'hidden',
        }}>
          {DUN_STATUS.map((s) => (
            <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: s === value ? '#EEF3FF' : 'transparent',
                fontSize: 12, fontWeight: s === value ? 700 : 500, color: C.dark, textTransform: 'capitalize',
              }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_C[s] || C.dim, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{s}</span>
              {s === value && <Check size={12} color={C.blue} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionsFollowup({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const vo = isViewOnly();   // view-only user: write actions disabled with a reason
  const boardQ = useCollectionsBoard(branch);
  const board = boardQ.data || { rows: [], totals: {} };
  const rows = board.rows || [];
  const t = board.totals || {};

  const upsert = useUpsertFollowup();
  const contact = useAddContact();
  const remind = useReminderRun();
  const brCode = branch?.code || branch;

  const [openLog, setOpenLog] = useState(null);   // party whose contact log/form is expanded
  const [draft, setDraft] = useState({ channel: 'call', note: '', outcome: '' });

  const save = (party, patch) => upsert.mutate({ party, branch: brCode, ...patch });
  const logContact = (party) => {
    if (!draft.note && !draft.outcome) return;
    contact.mutate({ party, branch: brCode, ...draft }, { onSuccess: () => setDraft({ channel: 'call', note: '', outcome: '' }) });
  };

  return (
    <Shell title="Collections Follow-up" sub={`${brLabel(branch)} · overdue customers (>30d) with promise-to-pay, contact log & dunning`}
      right={
        <>
          {Array.isArray(board.byCurrency)
            /* Consolidated view: ₹ (India) and $ (Africa) overdue kept separate — never one blended total. */
            ? board.byCurrency.map((c) => (
                <div key={c.currency} style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.red }}>Overdue {money(c.symbol, c.overdue || 0)} · {c.customers || 0} customers</div>
              ))
            : <div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: C.red }}>Overdue {money(cur, t.overdue || 0)} · {t.customers || 0} customers</div>}
          <button disabled={!rows.length || remind.isPending || vo} title={vo ? VIEW_ONLY_REASON : undefined} onClick={() => remind.mutate({ branch: brCode, channel: 'whatsapp' })}
            style={{ ...aBtn(C.amber), opacity: !rows.length || remind.isPending ? 0.6 : 1, ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>
            <ReceiptText size={12} /> {remind.isPending ? 'Sending…' : 'Send reminders to all'}</button>
        </>
      }>
      {remind.data && <div style={{ ...card, padding: 10, marginBottom: 10, color: C.green, fontWeight: 700, fontSize: 12 }}>✓ Dunning run logged — {remind.data.reminded} reminder(s) via {remind.data.channel}.</div>}
      <Table>
        <thead><tr>
          <th style={th}>Customer</th>
          {AGE_COLS.map(([, l]) => <th key={l} style={{ ...th, ...rnum }}>{l}</th>)}
          <th style={{ ...th, ...rnum }}>Overdue</th>
          <th style={th}>Status</th><th style={th}>Promise</th><th style={{ ...th, ...rnum }}>Remind</th>
          <th style={{ ...th, textAlign: 'center' }}>Action</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ Nothing overdue — all current.</td></tr>}
          {rows.map((r) => {
            const f = r.followup || {};
            const isOpen = openLog === r.party;
            return (
              <React.Fragment key={r.party}>
                <tr style={{ background: isOpen ? '#f4f8ff' : '#fff' }}>
                  <td style={{ ...td, fontWeight: 600, color: C.dark }}>{r.party}
                    {f.dunningLevel > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: C.red, fontWeight: 800 }}>L{f.dunningLevel}</span>}
                    <div style={{ fontSize: 10.5, color: C.dim }}>Total due {money(cur, r.total)}{f.lastContactAt ? ` · last contact ${fmtWhen(f.lastContactAt)}` : ''}</div>
                  </td>
                  {AGE_COLS.map(([k]) => <td key={k} style={{ ...td, ...rnum, color: k === 'd90' && r[k] > 0 ? C.red : C.dark }}>{r[k] ? money(cur, r[k]) : '—'}</td>)}
                  <td style={{ ...td, ...rnum, fontWeight: 800, color: C.red }}>{money(cur, r.overdue)}</td>
                  <td style={td}>
                    <StatusMenu value={f.status || 'open'} onChange={(s) => save(r.party, { status: s })} disabled={vo} />
                  </td>
                  <td style={td}>
                    <input type="date" value={fmtWhen(f.promisedDate)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} onChange={(e) => !vo && save(r.party, { promisedDate: e.target.value, status: e.target.value ? 'promised' : (f.status || 'open') })}
                      style={{ padding: '3px 6px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, ...rnum }}>
                    <span style={{ fontWeight: 700 }}>{f.remindersSent || 0}</span>
                    <button title={vo ? VIEW_ONLY_REASON : 'Send one reminder'} disabled={vo} onClick={() => remind.mutate({ branch: brCode, parties: [r.party], channel: 'whatsapp' })} style={{ ...aBtn(C.amber), marginLeft: 6, padding: '3px 7px', ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>Remind</button>
                  </td>
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {setRoute && <button title="Customer 360°" onClick={() => setRoute(`/reports/customer-360?party=${encodeURIComponent(r.party)}`)} style={{ ...aBtn(C.blue), marginRight: 4 }}>360°</button>}
                    {setRoute && <button onClick={() => setRoute(`/reports/client-statement?party=${encodeURIComponent(r.party)}`)} style={{ ...aBtn(C.dark), marginRight: 4 }}>Statement</button>}
                    {setRoute && <button onClick={() => setRoute('/receipts')} style={{ ...aBtn(C.green), marginRight: 4 }}>Receipt</button>}
                    <button onClick={() => { setOpenLog(isOpen ? null : r.party); setDraft({ channel: 'call', note: '', outcome: '' }); }} style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>{isOpen ? 'Hide' : `Log (${(f.contactLog || []).length})`}</button>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={10} style={{ ...td, background: '#f7f9ff' }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 320px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, marginBottom: 6 }}>LOG A CONTACT</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <select value={draft.channel} onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))} style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }}>
                              {['call', 'email', 'whatsapp', 'sms', 'visit', 'other'].map((c) => <option key={c}>{c}</option>)}
                            </select>
                            <input placeholder="Note (what was said)" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} style={{ flex: 1, minWidth: 160, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                            <input placeholder="Outcome (e.g. promised 5th)" value={draft.outcome} onChange={(e) => setDraft((d) => ({ ...d, outcome: e.target.value }))} style={{ width: 180, padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 }} />
                            <button onClick={() => logContact(r.party)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} style={{ ...aBtn(C.green), ...(vo ? { background: '#cfd6e4', color: '#6b7280', cursor: 'not-allowed' } : {}) }}>Save</button>
                          </div>
                          <textarea placeholder="Account notes (auto-saves)" defaultValue={f.notes || ''} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} onBlur={(e) => { if (!vo && e.target.value !== (f.notes || '')) save(r.party, { notes: e.target.value }); }}
                            rows={2} style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 6, padding: 6, fontSize: 12 }} />
                        </div>
                        <div style={{ flex: '1 1 320px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, marginBottom: 6 }}>CONTACT HISTORY ({(f.contactLog || []).length})</div>
                          {(f.contactLog || []).length === 0 ? <div style={{ fontSize: 12, color: C.dim }}>No contact logged yet.</div> :
                            (f.contactLog || []).map((c, j) => (
                              <div key={j} style={{ fontSize: 11.5, padding: '4px 0', borderBottom: '1px solid #dfe2e7' }}>
                                <b style={{ color: C.dark }}>{fmtWhen(c.at)}</b> · {c.channel} · {c.by} {c.note ? `— ${c.note}` : ''} {c.outcome ? <span style={{ color: C.green }}>({c.outcome})</span> : null}
                              </div>
                            ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </Table>
    </Shell>
  );
}

// ════════════════════════ 4) SUPPLIER RECONCILIATION ══════════════════════════
// Real statement reconciliation: import the vendor's statement of account, then
// match it line-by-line against OUR creditor ledger (the book). Mirrors Bank
// Reconciliation. Book side comes from the double-entry engine; statement side
// from the imported rows. Differences surface a missing bill / unposted payment.
