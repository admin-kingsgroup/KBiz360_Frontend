// ─── Today's FX Rate chip (view-only) ────────────────────────────────────────
// Shown in the shell top bar for the dual-currency Africa branches only (NBO/DAR/FBM).
// Displays the daily USD→local branch FX rate that an accountant sets each morning in
// the backend (Masters › Tax & Currency › Forex Rates). It is READ-ONLY here — books
// stay in USD; this rate only drives local-currency invoice/report printing. When today's
// rate hasn't been entered yet it shows an amber "not set" nudge (local printing is then
// blocked downstream).
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { branchCode } from '../core/useAccounting';
import { isVatBranch } from '../core/voucherSpecs';

export function FxRateChip({ branch }) {
  const code = branchCode(branch);
  const vat = isVatBranch(code);
  const { data } = useQuery({
    queryKey: ['forex-branch-rate', code],
    queryFn: () => apiGet(`/api/forex-rates/branch/${code}`),
    enabled: !!code && vat,
    staleTime: 5 * 60_000,
  });
  // Only dual-currency Africa branches carry a daily FX rate; India (₹) shows nothing.
  if (!vat) return null;

  const set = !!(data && data.set);
  const to = (data && data.to) || '';
  const rate = data && data.rate;
  const title = set
    ? `Today's branch FX rate (view only) — set in Masters › Forex Rates. 1 USD = ${rate} ${to} on ${data.date}.`
    : `Today's FX rate is not set for ${code}. Local-currency printing is blocked until an accountant enters it (Masters › Forex Rates).`;

  return (
    <div
      title={title}
      className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold wide:flex ${
        set ? 'border-surface-border bg-surface text-ink' : 'border-amber-300 bg-amber-50 text-amber-700'
      }`}
    >
      <span aria-hidden="true">💱</span>
      {set ? (
        <span>1 USD = <span className="text-navy">{Number(rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> {to}</span>
      ) : (
        <span>FX not set</span>
      )}
    </div>
  );
}
