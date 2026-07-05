import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { arapRow } from './utils/arap';

// ─── TK GROUP CENTRAL · Receivables & Payables (branchwise) ──────────────────
// Each branch's outstanding — receivables (with 90d+), payables and the net — in its
// OWN currency. Never consolidated into a group total.
const money = (cur, n) => `${cur || ''} ${Math.round(Number(n) || 0).toLocaleString()}`;
const cell = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left', whiteSpace: 'nowrap' };
const num = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export function ReceivablesPayables() {
  const q = useQueries({ queries: BRANCHES.map((b) => ({ queryKey: ['tk', 'arap', b.code], queryFn: () => apiGet('/api/accounting/ageing', { branch: b.code }), staleTime: 60_000 })) });
  const rows = BRANCHES.map((b, i) => arapRow(b, q[i] && q[i].data));

  return (
    <div>
      <p style={{ fontSize: 11.5, color: '#5a6691', margin: '0 0 10px' }}><b>Branchwise</b> — each branch's outstanding in its own currency, never consolidated.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }} data-testid="tk-arap">
          <thead>
            <tr>
              <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Receivables</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>90d+ overdue</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Payables</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Net</th>
              <th style={{ ...num, color: '#5a6691', fontWeight: 700 }}>Debtors / Creditors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td style={{ ...cell, fontWeight: 700 }}>{r.flag ? `${r.flag} ` : ''}{r.code}</td>
                <td style={num}>{money(r.cur, r.receivables)}</td>
                <td style={{ ...num, color: r.over90 > 0 ? '#A32F2F' : '#8892a4' }}>{money(r.cur, r.over90)}</td>
                <td style={num}>{money(r.cur, r.payables)}</td>
                <td style={{ ...num, fontWeight: 700, color: r.net < 0 ? '#A32F2F' : '#1f2a44' }}>{money(r.cur, r.net)}</td>
                <td style={{ ...num, color: '#8892a4' }}>{r.debtors} / {r.creditors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#8892a4', marginTop: 8 }}>Branchwise — never consolidated. Net = receivables − payables, per branch.</p>
    </div>
  );
}
