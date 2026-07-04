// ─── Outstanding & On-Account dashboard ──────────────────────────────────────
// Four buckets the finance team must action: unsettled Sales bills, unsettled
// Purchase bills, on-account Receipts (advances in), on-account Payments (advances
// out). Bills are settled ONLY by an explicit bill-wise allocation — there is NO
// FIFO auto-settle. On-account amounts sit here until you settle them bill-wise.
//
// UI: shared responsive primitives (PageLayout, DataTable, Modal, Button,
// ResponsiveGrid). Business logic / hooks unchanged.
import React, { useMemo, useState } from 'react';
import { bc } from '../../core/styles';
import { useOutstanding, useOpenBills, useSettleAdvance } from '../../core/useAccounting';
import { openLedgerModal } from '../../core/LedgerModalHost';
import { PageLayout } from '../../shell/PageLayout';
import { DataTable } from '../../shell/DataTable';
import { Modal, Button, Input, ResponsiveGrid, LoadingState, ErrorState } from '../../shell/primitives';

const RED = '#A32D2D', GREEN = '#27500A', GOLD = '#A07828', BLUE = '#185FA5', DIM = '#5a6691';
const money = (cur, n) => { const v = Math.round(Number(n) || 0); const loc = (cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US'; return (v < 0 ? '-' : '') + cur + Math.abs(v).toLocaleString(loc); };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ageColor = (d) => (d > 90 ? RED : d > 30 ? '#854F0B' : DIM);

const PartyLink = ({ name }) => (name
  ? <button onClick={() => openLedgerModal(name)} title="Open ledger account"
      className="font-semibold text-[#185FA5] underline underline-offset-2 hover:text-[#134d85]">{name}</button>
  : <span className="text-ink-subtle">—</span>);

// Settle an on-account advance against the party's open bills (bill-wise).
function SettleModal({ adv, side, branch, cur, onClose }) {
  const bq = useOpenBills(adv.party, branch, side);
  const settle = useSettleAdvance();
  const [amts, setAmts] = useState({});
  const open = bq.data?.bills || [];
  const entered = r2(Object.values(amts).reduce((t, v) => t + (Number(v) || 0), 0));
  const remaining = r2(adv.onAccount - entered);
  const set = (vno, val) => setAmts((a) => ({ ...a, [vno]: val }));
  const over = remaining < -0.01;
  const save = () => {
    const adds = open.filter((b) => Number(amts[b.billVno]) > 0).map((b) => ({ billId: b.billId, billVno: b.billVno, amount: Number(amts[b.billVno]) }));
    const allocations = [...(adv.allocations || []), ...adds];
    settle.mutate({ id: adv.id, allocations }, { onSuccess: onClose });
  };
  return (
    <Modal
      title={`Settle bill-wise — ${adv.vno}`}
      sub={`${adv.party} · advance ${money(cur, adv.total)} · on-account ${money(cur, adv.onAccount)} — allocate it across open bills.`}
      onClose={onClose}
      maxWidth={680}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className={`text-[11.5px] font-bold ${over ? 'text-maroon' : 'text-ink-muted'}`}>
            {over ? `Over-allocated by ${money(cur, -remaining)}` : `Remaining on-account: ${money(cur, remaining)}`}
          </span>
          <span className="inline-flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="success" size="sm" disabled={entered <= 0 || over || settle.isPending} loading={settle.isPending} onClick={save}>
              {settle.isPending ? 'Settling…' : `Settle ${money(cur, entered)}`}
            </Button>
          </span>
        </div>
      }
    >
      <div className="px-4 py-1">
        {bq.isLoading && <LoadingState label="Loading open bills…" />}
        {!bq.isLoading && open.length === 0 && <div className="py-5 text-center text-xs text-ink-muted">No open bills for {adv.party}.</div>}
        {open.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[11px] font-bold uppercase text-ink-muted">
                  <th className="border-b border-surface-border px-2.5 py-2 text-left">Bill No</th>
                  <th className="border-b border-surface-border px-2.5 py-2 text-left">Date</th>
                  <th className="border-b border-surface-border px-2.5 py-2 text-right">Outstanding</th>
                  <th className="border-b border-surface-border px-2.5 py-2 text-right">Settle now</th>
                  <th className="border-b border-surface-border px-2.5 py-2" />
                </tr>
              </thead>
              <tbody>
                {open.map((b) => {
                  // An OVER-settled bill rides in as the party's credit (ledger shows it
                  // Overpaid) — visible for context, but nothing can be allocated to it.
                  if (b.status === 'overpaid') {
                    return (
                      <tr key={b.billVno} className="text-xs">
                        <td className="border-b border-surface-alt px-2.5 py-1.5 font-semibold text-[#185FA5]">{b.billVno}</td>
                        <td className="border-b border-surface-alt px-2.5 py-1.5">{b.date}</td>
                        <td className="border-b border-surface-alt px-2.5 py-1.5 text-right font-bold tabular-nums text-[#C0651A]"
                          title={`Settled ${money(cur, b.allocated)} against ${money(cur, b.total)} billed — the excess is the party's credit`}>
                          −{money(cur, b.overpaidAmt)}
                        </td>
                        <td colSpan={2} className="border-b border-surface-alt px-2.5 py-1.5">
                          <span className="rounded-full bg-[#fff1e0] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#C0651A]">Overpaid</span>
                        </td>
                      </tr>
                    );
                  }
                  const max = r2(Math.min(b.outstanding, (Number(amts[b.billVno]) || 0) + Math.max(0, remaining)));
                  return (
                    <tr key={b.billVno} className="text-xs">
                      <td className="border-b border-surface-alt px-2.5 py-1.5 font-semibold text-[#185FA5]">{b.billVno}</td>
                      <td className="border-b border-surface-alt px-2.5 py-1.5">{b.date}</td>
                      <td className="border-b border-surface-alt px-2.5 py-1.5 text-right tabular-nums">{money(cur, b.outstanding)}</td>
                      <td className="border-b border-surface-alt px-2.5 py-1.5 text-right">
                        <Input type="number" value={amts[b.billVno] || ''} onChange={(e) => set(b.billVno, e.target.value)} className="ml-auto w-28 text-right" />
                      </td>
                      <td className="border-b border-surface-alt px-2.5 py-1.5">
                        <Button variant="secondary" size="xs" onClick={() => set(b.billVno, String(max))}>Max</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {settle.isError && <div className="mt-2 text-[11.5px] text-maroon">⚠ {settle.error?.message}</div>}
      </div>
    </Modal>
  );
}

// `side` scopes the screen to one party-side so it can be embedded as the
// "Open Bills & On-Account" tab of Receivables / Payables:
//   'customer' → only the AR tabs (unsettled sales bills + on-account receipts)
//   'supplier' → only the AP tabs (unsettled purchase bills + on-account payments)
//   undefined  → all four tabs (the standalone whole-book view)
export function OutstandingOnAccount({ branch, side, initialTab, initialParty }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useOutstanding(branch);
  const d = q.data || {};
  const t = d.totals || {};
  const showAR = side !== 'supplier';
  const showAP = side !== 'customer';
  // When deep-linked from the "Adjust advance" shortcut on the Payables ageing,
  // focus that supplier's on-account advances so the user can allocate straight away.
  const [partyFocus, setPartyFocus] = useState(initialParty || '');

  const KPIS = useMemo(() => [
    { k: 'sales', label: 'Unsettled Sales Bills', amt: t.salesOutstanding, n: (d.salesBills || []).length, color: BLUE, ar: true },
    { k: 'recAdv', label: 'On-Account Receipts', amt: t.onAccountReceipts, n: (d.onAccountReceipts || []).length, color: GREEN, ar: true },
    { k: 'purchase', label: 'Unsettled Purchase Bills', amt: t.purchaseOutstanding, n: (d.purchaseBills || []).length, color: RED, ap: true },
    { k: 'payAdv', label: 'On-Account Payments', amt: t.onAccountPayments, n: (d.onAccountPayments || []).length, color: GOLD, ap: true },
  ].filter((c) => (c.ar && showAR) || (c.ap && showAP)), [d, t, showAR, showAP]);

  const [tab, setTab] = useState(initialTab || (showAP && !showAR ? 'purchase' : 'sales'));
  const [settleAdv, setSettleAdv] = useState(null); // { adv, side }

  const moneyCell = (r, v) => money(cur, v);
  const ageCell = (r, v) => <span style={{ color: ageColor(v) }} className="font-bold tabular-nums">{v}</span>;

  const billColumns = (who) => [
    { key: 'party', header: who, render: (r) => <PartyLink name={r.party} /> },
    { key: 'billVno', header: 'Bill No', className: 'font-semibold text-[#185FA5]' },
    { key: 'date', header: 'Date' },
    { key: 'total', header: 'Bill Total', num: true, render: moneyCell },
    { key: 'settled', header: 'Settled', num: true, className: 'text-ink-muted', render: (r, v) => (v ? money(cur, v) : '—') },
    { key: 'outstanding', header: 'Outstanding', num: true, className: 'font-extrabold text-navy', render: moneyCell },
    { key: 'ageDays', header: 'Age (d)', num: true, render: ageCell },
  ];

  const advColumns = (who, side) => [
    { key: 'party', header: who, render: (r) => <PartyLink name={r.party} /> },
    { key: 'vno', header: 'Voucher', className: 'font-semibold text-[#185FA5]' },
    { key: 'date', header: 'Date' },
    { key: 'total', header: 'Amount', num: true, render: moneyCell },
    { key: 'allocated', header: 'Settled bill-wise', num: true, className: 'text-ink-muted', render: (r, v) => (v ? money(cur, v) : '—') },
    { key: 'onAccount', header: 'On-Account', num: true, render: (r, v) => <span style={{ color: GOLD }} className="font-extrabold tabular-nums">{money(cur, v)}</span> },
    { key: 'ageDays', header: 'Age (d)', num: true, render: ageCell },
    {
      key: '__action', header: 'Action', align: 'center', sortable: false, hideable: false, exportable: false,
      render: (r) => <Button variant="success" size="xs" onClick={() => setSettleAdv({ adv: r, side })}>Settle bill-wise</Button>,
    },
  ];

  const active = useMemo(() => {
    let a;
    if (tab === 'sales') a = { rows: d.salesBills || [], columns: billColumns('Customer'), empty: 'Nothing unsettled here. 🎉', name: 'unsettled-sales' };
    else if (tab === 'purchase') a = { rows: d.purchaseBills || [], columns: billColumns('Supplier'), empty: 'Nothing unsettled here. 🎉', name: 'unsettled-purchase' };
    else if (tab === 'recAdv') a = { rows: d.onAccountReceipts || [], columns: advColumns('Customer', 'customer'), empty: 'No on-account amounts awaiting settlement.', name: 'on-account-receipts' };
    else a = { rows: d.onAccountPayments || [], columns: advColumns('Supplier', 'supplier'), empty: 'No on-account amounts awaiting settlement.', name: 'on-account-payments' };
    if (partyFocus) a = { ...a, rows: a.rows.filter((r) => r.party === partyFocus) };
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, d, cur, partyFocus]);

  return (
    <PageLayout
      title="Outstanding & On-Account"
      subtitle="Unsettled bills + on-account advances awaiting bill-wise settlement. Bills clear only by an explicit allocation — nothing is auto-settled."
    >
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={q.error?.message || 'Failed to load'} onRetry={q.refetch} />}

      {!q.isLoading && !q.isError && (
        <>
          {partyFocus && (
            <div className="mb-3 flex items-center gap-2 text-[12px]">
              <span className="rounded-full bg-[#FFF6E0] px-2.5 py-1 font-bold text-[#8a6d1a]">Focused on {partyFocus}</span>
              <button className="text-[#185FA5] font-semibold underline" onClick={() => setPartyFocus('')}>show all parties</button>
            </div>
          )}
          <ResponsiveGrid min="220px" gap="md" className="mb-4">
            {KPIS.map((c) => (
              // NOTE: the colour hex must NEVER sit on the <button>'s own inline
              // style — global rules in index.css (button[style*="#185FA5"] etc.)
              // would then paint the whole card that colour and bury the text.
              // So the active ring lives on this wrapper div, and the brand colour
              // only appears on the child stripe/amount (descendants are unaffected).
              <div
                key={c.k}
                className="rounded-brand"
                style={tab === c.k ? { boxShadow: `0 0 0 2px ${c.color}55` } : undefined}
              >
                <button
                  onClick={() => setTab(c.k)}
                  className="relative h-full w-full overflow-hidden rounded-brand border border-surface-border bg-surface p-3.5 pl-4 text-left transition hover:shadow-sm"
                >
                  <span aria-hidden className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: c.color }} />
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">{c.label}</div>
                  <div className="mt-1 text-[22px] font-extrabold tabular-nums" style={{ color: c.color }}>{money(cur, c.amt)}</div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">{c.n} item{c.n === 1 ? '' : 's'}</div>
                </button>
              </div>
            ))}
          </ResponsiveGrid>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {KPIS.map((c) => (
              <button
                key={c.k}
                onClick={() => setTab(c.k)}
                style={tab === c.k ? { background: c.color, borderColor: c.color } : { borderColor: '#d6dbe6' }}
                className={`rounded-lg border px-3 py-2 text-[11.5px] font-bold transition max-tablet:min-h-[44px] ${tab === c.k ? 'text-white' : 'bg-surface text-ink-muted hover:bg-surface-alt'}`}
              >
                {c.label} ({c.n})
              </button>
            ))}
          </div>

          <DataTable
            columns={active.columns}
            rows={active.rows}
            getRowKey={(r, i) => r.billVno || r.vno || i}
            maxHeight="62vh"
            stickyHeader
            stickyFirstColumn
            zebra
            emptyMessage={active.empty}
            exportName={active.name}
            printTitle="Outstanding & On-Account"
          />
        </>
      )}

      {settleAdv && <SettleModal adv={settleAdv.adv} side={settleAdv.side} branch={branch} cur={cur} onClose={() => setSettleAdv(null)} />}
    </PageLayout>
  );
}
