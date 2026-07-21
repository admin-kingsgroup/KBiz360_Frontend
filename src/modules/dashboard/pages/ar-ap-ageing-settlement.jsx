import React from 'react';
import { DashboardHeader } from '../../../core/helpers';
import { WidgetCard } from '../../../core/styles';
import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';
import { PageLayout } from '../../../shell/PageLayout';
import { useAgeing } from '../../../core/useAccounting';
import { ArApSettlementView } from '../../../core/ArApSettlementView';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';
import { openPrintPreview } from '../../../core/PrintPreview';

/* Standalone Receivables/Payables "Ageing & Settlement" page — reuses the exact
 * same WidgetCard + ArApSettlementView the AD Dashboard renders (see
 * owner-dashboard.jsx `FinancialTables`), just on its own page. Gives the
 * Accounts pill's featured pills a one-click view of this card WITHOUT routing
 * through the full drilled report (/reports/rec · /reports/pay), which carries
 * its own tabs (Ageing / Settle / Net) the accountant didn't ask for here.
 */
function ArApAgeingSettlementPage({ side, branch, currentUser, setRoute }) {
  const isRec = side === 'receivable';
  const key = isRec ? 'receivables' : 'payables';
  const color = isRec ? '#dc2626' : '#16a34a';
  const drill = () => setRoute?.(isRec ? '/reports/rec?tab=settlement' : '/reports/pay?tab=settlement');
  const cur = bc(branch).cur;
  const fmt = (n) => compactAmt(n, { currency: cur });
  const { data, isLoading, isError, error, refetch } = useAgeing(branch);
  const title = isRec ? 'Receivables — Ageing & Settlement' : 'Payables — Ageing & Settlement';
  const subtitle = `Bills · settled · unsettled · ageing by ${isRec ? 'client type' : 'category'}`;

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title={`Could not load ${title}.`} />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={6} columns={1} />;
  }

  // Consolidated/Group scope: render ONE card PER BRANCH from `byBranch`, each in its own
  // currency — never the merged top-level, which blends NBO/DAR/FBM USD bills with the
  // India ₹ bills into a single ₹-labelled total (inter-branch FX is manual; we never sum
  // currencies). Single-branch: the merged slice IS that branch, so render it as before.
  const isAll = branch === 'ALL' || branch?.code === 'ALL' || !branch;
  const perBranch = isAll && Array.isArray(data.byBranch) && data.byBranch.length ? data.byBranch : null;

  return (
    <PageLayout>
      <DashboardHeader
        title={title}
        subtitle={subtitle}
        user={currentUser}
        onExport={() => openPrintPreview({ selector: 'main', title, recommend: 'landscape' })}
      />
      {perBranch ? (
        perBranch.map((b) => {
          const bCur = bc({ code: b.branch }).cur;
          const bFmt = (n) => compactAmt(n, { currency: bCur });
          const bSlice = b[key] || {};
          return (
            <WidgetCard key={b.branch} title={`${title} — ${b.branch}`} subtitle={`${subtitle} · ${bCur}`}
              color={color} onDrill={drill}>
              <ArApSettlementView side={side} totals={bSlice.totals || {}} rows={bSlice.rows || []} formatMoney={bFmt} collapsed />
            </WidgetCard>
          );
        })
      ) : (
        <WidgetCard title={title} subtitle={subtitle} color={color} onDrill={drill}>
          <ArApSettlementView side={side} totals={(data[key] || {}).totals || {}} rows={(data[key] || {}).rows || []} formatMoney={fmt} collapsed />
        </WidgetCard>
      )}
    </PageLayout>
  );
}

export function ReceivablesAgeingSettlementPage({ branch, currentUser, setRoute }) {
  return <ArApAgeingSettlementPage side="receivable" branch={branch} currentUser={currentUser} setRoute={setRoute} />;
}
export function PayablesAgeingSettlementPage({ branch, currentUser, setRoute }) {
  return <ArApAgeingSettlementPage side="payable" branch={branch} currentUser={currentUser} setRoute={setRoute} />;
}
