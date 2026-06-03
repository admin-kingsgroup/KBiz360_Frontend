/* ════════════════════════════════════════════════════════════════════
   MODULES/COST-CENTERS-LIVE.JSX

   Cost Centre Master — the FIXED, seeded cost centres used for module-wise
   Gross Profit on sales & purchase: the 7 product modules, with Int'l /
   Domestic sub-centres for Flights & Holiday Packages.

   Seeded server-side and immutable — there is no add / edit / delete. This
   screen is VIEW-ONLY and restricted to Super Admin.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useCostCenters, useBackfillCostCenters } from '../core/useAccounting';

const DARK = '#0d1326', GOLD = '#d4a437', DIM = '#5a6691', GREEN = '#27500A';
const isSuperAdmin = (u) => /super\s*admin/i.test(u?.role || '');

export function CostCenterMasterLive({ currentUser }) {
  const q = useCostCenters();
  const backfill = useBackfillCostCenters();
  const [bfMsg, setBfMsg] = useState('');
  const data = q.data || {};
  const centers = data.costCenters || [];
  const modules = data.modules || [];

  const runBackfill = () => {
    setBfMsg('');
    backfill.mutate(undefined, {
      onSuccess: (d) => setBfMsg(`✓ Re-tagged ${d.updated} of ${d.scanned} untagged voucher(s).`),
      onError: (e) => setBfMsg(`⚠ ${e.message}`),
    });
  };

  if (!isSuperAdmin(currentUser)) {
    return (
      <div style={{ maxWidth: 760, margin: '40px auto', padding: 28, background: '#fff', border: '1px solid #e1e3ec', borderRadius: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>🔒</div>
        <h2 style={{ margin: 0, color: DARK, fontSize: 17 }}>Cost Centre Master — restricted</h2>
        <p style={{ color: DIM, fontSize: 12.5, marginTop: 8 }}>
          These cost centres are seeded and view-only. Access is limited to <b>Super Admin</b>.
          {currentUser?.role && <> Your role is <b>{currentUser.role}</b>.</>}
        </p>
      </div>
    );
  }

  // Group leaves under their module, in the seeded module order.
  const byModule = modules.map((m) => ({ ...m, leaves: centers.filter((c) => c.module === m.key) }));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>Cost Centre Master</h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: DIM }}>Fixed cost centres for module-wise Gross Profit on sales &amp; purchase · seeded &amp; immutable</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 10px', background: '#eef4ec', color: GREEN, border: '1px solid #cfe3c4', borderRadius: 14, fontSize: 11, fontWeight: 700 }}>🔒 Seeded · View only</span>
          <span style={{ padding: '4px 10px', background: '#fff7e6', color: '#8a6300', border: '1px solid #f0dca6', borderRadius: 14, fontSize: 11, fontWeight: 700 }}>{centers.length} cost centres</span>
          <button onClick={runBackfill} disabled={backfill.isPending}
            style={{ padding: '6px 12px', background: DARK, color: GOLD, border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: backfill.isPending ? 'wait' : 'pointer' }}
            title="Re-derive the cost centre for already-imported vouchers from their saved Ticket Type / Service Type / Country">
            {backfill.isPending ? 'Re-tagging…' : '↻ Re-tag existing vouchers'}
          </button>
        </div>
      </div>
      {bfMsg && <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: bfMsg[0] === '✓' ? '#eef4ec' : '#FCEBEB', color: bfMsg[0] === '✓' ? GREEN : '#A32D2D', fontSize: 12, fontWeight: 600 }}>{bfMsg}</div>}

      {q.isLoading && <div style={{ padding: 28, textAlign: 'center', color: DIM, background: '#fff', border: '1px solid #e1e3ec', borderRadius: 10 }}>Loading…</div>}
      {q.isError && <div style={{ padding: 16, color: '#A32D2D', background: '#FCEBEB', border: '1px solid #f3c9c9', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>⚠ {q.error?.message || 'Failed to load cost centres'}</div>}

      {!q.isLoading && !q.isError && (
        <div style={{ background: '#fff', border: '1px solid #e1e3ec', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: DARK }}>
                {['Code', 'Cost Centre', 'Module', 'Applies To', 'Status'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: i > 2 ? 'center' : 'left', color: GOLD, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byModule.map((m) => (
                <React.Fragment key={m.key}>
                  <tr style={{ background: '#f3f6fb', borderTop: '1px solid #e1e3ec' }}>
                    <td colSpan={5} style={{ padding: '7px 14px', fontWeight: 700, color: DARK }}>
                      <span style={{ marginRight: 7 }}>{m.icon}</span>{m.key}
                      {m.hasSubs ? <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 700, color: '#185FA5', background: '#e6f1fb', border: '1px solid #c3ddf5', borderRadius: 5, padding: '1px 6px' }}>INT'L / DOMESTIC</span>
                        : <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 700, color: DIM, background: '#f0f1f5', border: '1px solid #e1e3ec', borderRadius: 5, padding: '1px 6px' }}>SINGLE</span>}
                    </td>
                  </tr>
                  {m.leaves.map((c) => (
                    <tr key={c.code} style={{ borderTop: '1px solid #f0f2f7' }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, color: DARK }}>{c.code}</td>
                      <td style={{ padding: '8px 14px 8px 28px', color: DARK }}>{c.name}</td>
                      <td style={{ padding: '8px 14px', color: DIM }}>{c.module}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', color: DIM }}>Sales &amp; Purchase</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: '#eef4ec', color: GREEN, borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>● Active</span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 10.5, color: DIM, marginTop: 12, lineHeight: 1.6 }}>
        These cost centres are fixed and cannot be added, edited or deleted. Hotels, Visa, Car Rental, Insurance and
        Miscellaneous are tagged automatically from the voucher type. Flights and Holiday are split into International /
        Domestic from the CRM billing push; until a voucher is tagged it rolls up under that module's “Unspecified” line
        in the Profit &amp; Loss report.
      </p>
    </div>
  );
}
