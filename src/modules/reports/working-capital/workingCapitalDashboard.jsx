/* ════════════════════════════════════════════════════════════════════
   WORKING CAPITAL DASHBOARD — wired to LIVE books (no sample figures).
   Trade Receivables / Trade Payables / Net Working Capital come from the live
   ageing endpoint (useAgeing) for the selected branch. The cash-conversion
   cycle (DSO/DPO) and 6-month trend need a dedicated compute endpoint, so they
   are called out as pending rather than fabricated.
   MENU_REPORTS ▸ Working Capital (href /reports/working-capital).
   ════════════════════════════════════════════════════════════════════ */

import { useMobile } from '../../../core/hooks';
import { bc } from '../../../core/styles';
import { fmt } from '../../../core/format';
import { useAgeing } from '../../../core/useAccounting';

export function WorkingCapitalDashboard({ branch, setRoute }) {
  const mob = useMobile();
  const cur = bc(branch).cur;                       // branch currency symbol (₹ for India/MHUB)
  const { data, isLoading, isError, refetch } = useAgeing(branch);

  const ar = Number(data?.receivables?.totals?.total || 0);
  const ap = Number(data?.payables?.totals?.total || 0);
  const netWC = ar - ap;                            // inventory ≈ 0 for a travel business
  const card = { background: '#fff', borderRadius: 10, border: '1px solid #cdd1d8', padding: '12px 14px' };

  return (
    <div style={{ padding: '12px 10px', maxWidth: 1600, margin: '0 auto' }}>
      <h2 style={{ margin: 0, fontSize: mob ? 16 : 19, fontWeight: 800, color: '#0d1326' }}>💼 Working Capital</h2>
      <p style={{ margin: '4px 0 10px', fontSize: 11.5, color: '#5a6691' }}>{(branch?.code || 'All branches')} · Receivables − Payables · live from your books</p>

      {isLoading ? (
        <div style={{ ...card, textAlign: 'center', color: '#5a6691' }}>Loading working-capital figures…</div>
      ) : isError ? (
        <div style={{ ...card, color: '#A32D2D' }}>Couldn’t load working capital for <b>{branch?.code || 'this view'}</b>. <button onClick={() => refetch()} style={{ marginLeft: 8, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 0, color: '#185FA5' }}>Retry</button> — this is a load error, not an empty result.</div>
      ) : (ar === 0 && ap === 0) ? (
        <div role="note" style={{ ...card, background: '#f3f4f8', color: '#5a6691' }}>No receivables or payables yet for <b>{branch?.code || 'this view'}</b>. Working-capital figures populate here as soon as bills are raised or received — meanwhile see the Receivables &amp; Payables ageing reports.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ ...card, borderTop: '3px solid #27500A' }}><p style={{ margin: 0, fontSize: 10, color: '#5a6691', textTransform: 'uppercase' }}>Trade Receivables</p><p style={{ margin: '4px 0 0', fontSize: mob ? 16 : 22, fontWeight: 800, color: '#27500A' }}>{cur + fmt(ar)}</p></div>
          <div style={{ ...card, borderTop: '3px solid #A32D2D' }}><p style={{ margin: 0, fontSize: 10, color: '#5a6691', textTransform: 'uppercase' }}>Trade Payables</p><p style={{ margin: '4px 0 0', fontSize: mob ? 16 : 22, fontWeight: 800, color: '#A32D2D' }}>{cur + fmt(ap)}</p></div>
          <div style={{ ...card, borderTop: '3px solid #854F0B' }}><p style={{ margin: 0, fontSize: 10, color: '#5a6691', textTransform: 'uppercase' }}>Net Working Capital</p><p style={{ margin: '4px 0 0', fontSize: mob ? 16 : 22, fontWeight: 800, color: netWC < 0 ? '#A32D2D' : '#854F0B' }}>{cur + fmt(netWC)}</p><p style={{ margin: 0, fontSize: 10, color: '#5a6691' }}>Receivables − Payables</p></div>
        </div>
      )}

      <div role="note" style={{ ...card, background: '#FAEEDA', border: '1px solid #f0d28a', fontSize: 11.5, color: '#854F0B', marginTop: 4 }}>
        Cash-conversion cycle (DSO / DPO) and the 6-month trend need a dedicated computation and are <b>not shown yet</b> — deliberately, rather than estimated. For detail, use the Receivables &amp; Payables ageing and Cash Flow Forecast reports.
      </div>
    </div>
  );
}
