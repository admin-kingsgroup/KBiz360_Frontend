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
  const cur = bc(branch).cur;
  const fmt = (n) => compactAmt(n, { currency: cur });
  const { data, isLoading, isError, error, refetch } = useAgeing(branch);
  const title = isRec ? 'Receivables — Ageing & Settlement' : 'Payables — Ageing & Settlement';
  const subtitle = 'Bills · settled · unsettled · ageing by sub-group';

  if (isError && !data) {
    return <DashboardError error={error} onRetry={refetch} title={`Could not load ${title}.`} />;
  }
  if (isLoading || !data) {
    return <DashboardSkeleton numKpis={6} columns={1} />;
  }

  const slice = data[isRec ? 'receivables' : 'payables'] || {};

  return (
    <PageLayout>
      <DashboardHeader
        title={title}
        subtitle={subtitle}
        user={currentUser}
        onExport={() => openPrintPreview({ selector: 'main', title, recommend: 'landscape' })}
      />
      <WidgetCard title={title} subtitle={subtitle} color={isRec ? '#dc2626' : '#16a34a'}
        onDrill={() => setRoute?.(isRec ? '/reports/rec' : '/reports/pay')}>
        <ArApSettlementView side={side} totals={slice.totals || {}} rows={slice.rows || []} formatMoney={fmt} collapsed />
      </WidgetCard>
    </PageLayout>
  );
}

export function ReceivablesAgeingSettlementPage({ branch, currentUser, setRoute }) {
  return <ArApAgeingSettlementPage side="receivable" branch={branch} currentUser={currentUser} setRoute={setRoute} />;
}
export function PayablesAgeingSettlementPage({ branch, currentUser, setRoute }) {
  return <ArApAgeingSettlementPage side="payable" branch={branch} currentUser={currentUser} setRoute={setRoute} />;
}
