/* ════════════════════════════════════════════════════════════════════
   taxLive — shared live-books helpers for the statutory tax screens
   (GSTR-9C · Tax Audit 3CD · Form 26AS · Form 16A · E-Invoice · E-Way).

   Everything here is FRONTEND-COMPUTED from the same accounting endpoints
   the live reports already use (the Notes-to-Financials precedent):
     · /api/accounting/trial-balance  — discover the real TDS chart ledgers
     · /api/accounting/ledger?name=…  — their posting lines (per party)
     · /api/accounting/gp-bills       — per-bill GST base (GSTR-1/3B source)
   No new backend, no demo fallback — empty books in, empty screens out.
   ════════════════════════════════════════════════════════════════════ */

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from '../../core/api';
import { branchCode } from '../../core/useAccounting';

const enabled = () => !!getAuthToken();

/* ── TDS chart-ledger discovery + statements ─────────────────────────
   The chart's canonical tax heads are branch-tagged ('TDS Payable [BOM]',
   'TDS Receivable [DAR]'); legacy imports may still carry names like
   'Receivable TDS FY=24-25'. Match by pattern, never by a hardcoded list. */
const TDS_LEDGER_RE = {
  payable: /tds[^a-z]*payab|payab[^a-z]*tds/i,
  receivable: /tds[^a-z]*receivab|receivab[^a-z]*tds/i,
};

/** One query: pull the trial balance for the window, find every ledger whose
 *  name matches the TDS payable/receivable pattern, then fetch each ledger's
 *  statement (posting lines carry date/vno/party/category/narration).
 *  Returns { names:[…], statements:[ledgerStatement…] }. */
export function useTdsLedgerStatements(kind, branch, { from, to } = {}) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['accounting', 'tds-statements', kind, code || 'all', from || '', to || ''],
    queryFn: async () => {
      const tb = await apiGet('/api/accounting/trial-balance', { branch: code, from, to });
      const re = TDS_LEDGER_RE[kind] || TDS_LEDGER_RE.payable;
      const names = (tb?.rows || []).map((r) => r.ledger).filter((n) => re.test(String(n || '')));
      const statements = (
        await Promise.all(
          names.map((name) => apiGet('/api/accounting/ledger', { name, branch: code, from, to }).catch(() => null)),
        )
      ).filter(Boolean);
      return { names, statements };
    },
    enabled: enabled(),
    staleTime: 30_000,
  });
}

/* ── posting-line helpers ──────────────────────────────────────────── */

/** Best-effort TDS/TCS section from the posting narration ('TDS 194H', 'TDS
 *  u/s 194C', '192B payable TDS', 'TCS collected u/s 206C(1G)'). The section
 *  is NOT a chart dimension, so anything unlabelled honestly shows '—'. */
export function tdsSectionOf(line) {
  const s = `${line?.narration || ''} ${line?.entryNarration || ''}`;
  const m = s.match(/\b(19[245][0-9]?\s*-?\s*[A-Z]{0,2}|206C\s*(?:\(1G\))?)\b/i);
  return m ? m[1].replace(/\s|-/g, '').toUpperCase() : '—';
}

/** FY quarter of an ISO date (Apr–Jun = Q1 … Jan–Mar = Q4). */
export function fyQuarterOfISO(iso) {
  const m = Number(String(iso || '').slice(5, 7));
  if (!m) return '—';
  return m >= 4 && m <= 6 ? 'Q1' : m >= 7 && m <= 9 ? 'Q2' : m >= 10 ? 'Q3' : 'Q4';
}

/** Flatten TDS ledger statements to the ACCRUAL lines only.
 *  · TDS Payable accrues on the Cr side (we withheld from a supplier);
 *    its Dr lines are deposits to the government.
 *  · TDS Receivable accrues on the Dr side (a party withheld on us);
 *    its Cr lines are claims/adjustments.
 *  Returns [{ date, vno, category, party, branch, ledger, section, quarter,
 *  narration, amount }], date-ordered. */
export function tdsAccrualEntries(statements, accrualSide /* 'Cr' | 'Dr' */) {
  const out = [];
  for (const st of statements || []) {
    for (const l of st.lines || []) {
      const amt = accrualSide === 'Cr' ? Number(l.credit) || 0 : Number(l.debit) || 0;
      if (amt <= 0.005) continue;
      out.push({
        date: l.date, vno: l.vno, category: l.category || '', party: l.party || '(no party)',
        branch: l.branch || '', ledger: st.ledger, section: tdsSectionOf(l),
        quarter: fyQuarterOfISO(l.date), narration: l.narration || l.entryNarration || '',
        amount: amt,
      });
    }
  }
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.vno).localeCompare(String(b.vno)));
  return out;
}

/** Total posted on the RELIEF side (deposits for Payable, claims for
 *  Receivable) across the statements' lines. */
export function tdsReliefTotal(statements, accrualSide) {
  let t = 0;
  for (const st of statements || []) {
    for (const l of st.lines || []) t += accrualSide === 'Cr' ? Number(l.debit) || 0 : Number(l.credit) || 0;
  }
  return Math.round(t * 100) / 100;
}

/* ── gp-bills GST base (same rule as the live GSTR-1 / GSTR-3B screens) ── */
export const gstRateOf = (mod) => (mod === 'Holiday' ? 5 : 18);
export const taxableOf = (b) => (Number(b?.sell) || 0) / (1 + gstRateOf(b?.mod) / 100);
export const gstOf = (b) => (Number(b?.sell) || 0) - taxableOf(b);

/** Sale-side gp-bill rows for a branch + [from,to] window (bills carrying a
 *  sale leg — every posted GST sale invoice is an e-invoice candidate). */
export function saleBills(gp, brCode, { from, to } = {}) {
  return (gp || []).filter((b) => {
    if (!((Number(b.sell) || 0) > 0)) return false;
    if (brCode && b.branch !== brCode) return false;
    const d = String(b.date || '');
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}
