/* ════════════════════════════════════════════════════════════════════
   MONTH-END CHECKLIST / DAY-CLOSE  /accounts/month-end
   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_ACCOUNTS ▸ Period Close ▸
   "Month-End Checklist / Day-Close").
   ════════════════════════════════════════════════════════════════════ */
import { useEffect, useState } from 'react';
import { bc } from '../../../core/styles';
import { clickable } from '../../../core/ux/clickable';
import { branchCode, useBookingOrders, useConfigValue, useSaveConfigValue, useVoucherApprovals, useTrialBalance } from '../../../core/useAccounting';
import { C, Shell, aBtn, brLabel, card, money, thisYM } from '../../accountantWorkspace/shared';

export function MonthEndChecklist({ branch, setRoute }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const bookings = useBookingOrders(branch, { status: 'pending' }).data || []; // only pending is used here (stuck/suspense/counts)
  // /api/vouchers/approvals returns { counts, entries } — use the entries[] array.
  const pendVouchers = useVoucherApprovals(branch, 'pending').data?.entries || [];
  const tbData = useTrialBalance(branch).data || {};
  const tb = tbData.rows || [];

  // Manual ticks persist per branch × month in the generic app-config store, so they
  // survive reloads and are shared across the branch's accountants.
  const period = thisYM();
  const cfgKey = `month-end:${branchCode(branch) || 'ALL'}:${period}`;
  const savedQ = useConfigValue(cfgKey);
  const saver = useSaveConfigValue();
  const [manual, setManual] = useState({});
  // Hydrate from the saved ticks. Key the effect on the STRINGIFIED value (a stable
  // primitive) so a new-but-equal object reference can't trigger a re-render loop.
  const savedJson = JSON.stringify(savedQ.data || {});
  useEffect(() => { setManual(JSON.parse(savedJson)); }, [savedJson]);
  const toggleManual = (k) => setManual((m) => {
    const next = { ...m, [k]: !m[k] };
    saver.mutate({ key: cfgKey, value: next, description: `Month-end checklist ${period}` });
    return next;
  });

  const pendCount = bookings.filter((b) => b.status === 'pending').length + pendVouchers.length;
  const suspenseCount = bookings.filter((b) => b.status === 'pending' && b.validation?.hasErrors).length;
  const tbDr = tb.reduce((s, r) => s + (Number(r.closingDebit ?? r.debit) || 0), 0);
  const tbCr = tb.reduce((s, r) => s + (Number(r.closingCredit ?? r.credit) || 0), 0);
  const tbBalanced = Math.abs(tbDr - tbCr) < 1;

  // auto = derived from live data · manual = accountant ticks (this session)
  const items = [
    { key: 'post', auto: pendCount === 0, label: 'All vouchers approved & posted', detail: pendCount ? `${pendCount} still pending` : 'nothing pending', route: '/transactions/approvals' },
    { key: 'suspense', auto: suspenseCount === 0, label: 'Suspense cleared', detail: suspenseCount ? `${suspenseCount} stuck` : 'none', route: '/accounts/suspense' },
    { key: 'tb', auto: tbBalanced, label: 'Trial Balance balanced (Dr = Cr)', detail: tbBalanced ? 'balanced' : `out by ${money(cur, Math.abs(tbDr - tbCr))}`, route: '/finance/trial-balance' },
    { key: 'bankreco', manualOnly: true, label: 'Bank reconciliation done', detail: 'tick when reconciled', route: '/bank-reco' },
    { key: 'debtors', manualOnly: true, label: 'Debtors & creditors reviewed', detail: 'tick when followed up', route: '/accounts/net-ageing' },
    { key: 'cash', manualOnly: true, label: 'Cash counted vs Cash Book', detail: 'tick at day-close', route: '/finance/cash-book' },
  ];
  const done = items.filter((it) => it.manualOnly ? manual[it.key] : it.auto).length;

  return (
    <Shell title="Month-End Checklist / Day-Close" sub={`${brLabel(branch)} · close the books cleanly — auto-checks update live; tick the manual ones`}
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 800, color: done === items.length ? C.green : C.amber }}>{done}/{items.length} done</div>}>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {items.map((it, i) => {
          const ok = it.manualOnly ? !!manual[it.key] : it.auto;
          return (
            <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i ? '1px solid #dfe2e7' : 'none' }}>
              <span {...(it.manualOnly ? clickable(() => toggleManual(it.key)) : {})}
                style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', cursor: it.manualOnly ? 'pointer' : 'default', background: ok ? C.green : (it.manualOnly ? '#cbd0db' : C.amber) }}>
                {ok ? '✓' : (it.manualOnly ? '' : '!')}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{it.label} {it.manualOnly && <span style={{ fontSize: 10, color: C.dim, fontWeight: 600 }}>(manual)</span>}</div>
                <div style={{ fontSize: 11, color: ok ? C.green : C.dim }}>{it.detail}</div>
              </div>
              <button onClick={() => setRoute && setRoute(it.route)} style={aBtn(C.blue)}>Open</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Auto-checks (post · suspense · trial balance) reflect live data. Manual ticks are saved per branch &amp; month{saver.isPending ? ' · saving…' : ''}.</div>
    </Shell>
  );
}
