/* ════════════════════════════════════════════════════════════════════
   STATISTICS — Tally-style "Statistics" report.

   Master counts (Groups by tier · Ledgers · Cost Centres · Cost Categories ·
   Voucher Types · Budgets · Scenarios) + voucher counts by type × status, live
   from GET /api/accounting/statistics. Branch-aware (top-right selector). Each
   voucher row drills through to its register.
   ════════════════════════════════════════════════════════════════════ */
import React from 'react';
import { card } from '../core/styles';
import { useStatistics } from '../core/useAccounting';
import { SkeletonTable } from '../shell/primitives';

const DARK = '#0d1326', BLUE = '#0070f2', DIM = '#5a6691';

// category → the register route a voucher row drills to ('' = no drill).
export function voucherRegister(category) {
  return ({
    sale: '/reports/sreg',
    purchase: '/reports/preg',
    receipt: '/finance/receipt-register',
    payment: '/finance/payment-register',
    contra: '/finance/contra-register',
    journal: '/finance/journal-register',
    'purchase-expense': '/reports/preg',
  })[category] || '';
}

const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));

function MasterRow({ label, value, indent, onClick }) {
  return (
    <tr style={{ borderBottom: '1px solid #dfe2e7', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <td style={{ padding: '7px 13px', color: indent ? DIM : '#334155', paddingLeft: indent ? 30 : 13, fontWeight: indent ? 400 : 600 }}>{label}</td>
      <td style={{ padding: '7px 13px', textAlign: 'right', fontWeight: 700, color: onClick ? BLUE : DARK }}>{value}</td>
    </tr>
  );
}

export function Statistics({ branch, setRoute }) {
  const { data, isLoading, isError, error } = useStatistics(branch);
  const go = (href) => href && setRoute && setRoute(href);
  const m = data?.masters || {};
  const vouchers = data?.vouchers || [];
  const totals = data?.totals;
  const th = { textAlign: 'left', padding: '9px 13px', fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#c2a04a' };
  const tdN = { padding: '8px 13px', textAlign: 'right', color: '#334155' };

  return (
    <div style={{ padding: '12px 10px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>Statistics</h2>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>Masters &amp; voucher counts {data?.branch && data.branch !== 'ALL' ? `· ${data.branch}` : '· All branches'} · live</p>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 14, alignItems: 'start' }}>
          <SkeletonTable rows={9} cols={2} />
          <SkeletonTable rows={7} cols={5} />
        </div>
      )}
      {isError && <div style={{ ...card, padding: 16, color: '#A32D2D', fontSize: 12, fontWeight: 600 }}>⚠ {error?.message || 'Failed to load'} — is the ERP backend running and are you logged in?</div>}

      {!isLoading && !isError && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 14, alignItems: 'start' }}>
          {/* ── Masters ── */}
          <div className="kb-sticky" style={{ ...card, padding: 0, '--stick-head': '#1a1c22' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr><th style={th}>Masters</th><th style={{ ...th, textAlign: 'right' }}>Count</th></tr></thead>
              <tbody>
                <MasterRow label="Groups (total)" value={num(m.groups?.total)} onClick={() => go('/masters/groups')} />
                <MasterRow indent label="Primary Groups" value={num(m.groups?.primary)} />
                <MasterRow indent label="Primary Sub Groups" value={num(m.groups?.primarySub)} />
                <MasterRow indent label="ERP Groups" value={num(m.groups?.erpGroup)} />
                <MasterRow indent label="ERP Sub Groups" value={num(m.groups?.erpSub)} />
                <MasterRow label="Ledgers (active)" value={`${num(m.ledgers?.active)} / ${num(m.ledgers?.total)}`} onClick={() => go('/masters/ledgers')} />
                <MasterRow label="Cost Centres" value={num(m.costCenters)} onClick={() => go('/masters/cost-centers')} />
                <MasterRow label="Cost Categories" value={num(m.costCategories)} onClick={() => go('/masters/cost-categories')} />
                <MasterRow label="Voucher Types" value={num(m.voucherTypes)} onClick={() => go('/masters/voucher-types')} />
                <MasterRow label="Budgets" value={num(m.budgets)} onClick={() => go('/masters/budgets')} />
                <MasterRow label="Scenarios" value={num(m.scenarios)} onClick={() => go('/masters/scenarios')} />
              </tbody>
            </table>
          </div>

          {/* ── Vouchers ── */}
          <div className="kb-sticky" style={{ ...card, padding: 0, '--stick-head': '#1a1c22' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr>
                <th style={th}>Voucher Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Posted</th>
                <th style={{ ...th, textAlign: 'right' }}>Pending</th>
                <th style={{ ...th, textAlign: 'right' }}>Deleted</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {vouchers.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: DIM }}>No vouchers yet.</td></tr>}
                {vouchers.map((v) => {
                  const href = voucherRegister(v.category);
                  return (
                    <tr key={v.category} style={{ borderBottom: '1px solid #dfe2e7', cursor: href ? 'pointer' : 'default' }} onClick={() => go(href)} title={href ? 'Open register' : ''}>
                      <td style={{ padding: '8px 13px', fontWeight: 600, color: href ? BLUE : '#334155' }}>{v.label}</td>
                      <td style={tdN}>{num(v.posted)}</td>
                      <td style={{ ...tdN, color: v.pending ? '#A06A00' : '#c2c8d6' }}>{v.pending ? num(v.pending) : '—'}</td>
                      <td style={{ ...tdN, color: v.deleted ? '#A32D2D' : '#c2c8d6' }}>{v.deleted ? num(v.deleted) : '—'}</td>
                      <td style={{ ...tdN, fontWeight: 700, color: DARK }}>{num(v.total)}</td>
                    </tr>
                  );
                })}
                {totals && (
                  <tr style={{ background: '#f7f8fb', borderTop: '2px solid #cdd1d8' }}>
                    <td style={{ padding: '9px 13px', fontWeight: 800, color: DARK }}>TOTAL</td>
                    <td style={{ ...tdN, fontWeight: 800 }}>{num(totals.posted)}</td>
                    <td style={{ ...tdN, fontWeight: 800 }}>{num(totals.pending)}</td>
                    <td style={{ ...tdN, fontWeight: 800 }}>{num(totals.deleted)}</td>
                    <td style={{ ...tdN, fontWeight: 800 }}>{num(totals.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Statistics;
