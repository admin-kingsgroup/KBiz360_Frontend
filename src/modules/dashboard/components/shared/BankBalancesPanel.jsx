import React from 'react';
import { fmtINR } from '../../../../core/format';

// `formatMoney` is the branch-aware money formatter (compactAmt) — renders each bank's live
// closing balance in the branch's own currency with house Cr/L compaction, replacing the old
// raw "{₹} {/1000}K" (wrong symbol for USD branches). The account-number "...{last6}" and
// "% of limit" lines were dropped: the source never carries an account number or a sanctioned
// limit (they were hardcoded '' / 0), so both rendered as dead "..." / "0% of limit".
export function BankBalancesPanel({ accounts, formatMoney = fmtINR, limit = 7 }) {
  return (
    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
      {(accounts || []).slice(0, limit).map((b) => (
        <div
          key={b.id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #dfe2e7' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: '#14161a',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {b.bank}
            </p>
            <p style={{ margin: 0, fontSize: 9.5, color: '#5b616e' }}>{b.branch}</p>
          </div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap', color: b.openingBal < 0 ? '#dc2626' : '#14161a' }}>
            {formatMoney(b.openingBal)}
          </p>
        </div>
      ))}
      {(!accounts || accounts.length === 0) && <p style={{ margin: 0, padding: '8px 0', fontSize: 10.5, color: '#5b616e' }}>No bank balances.</p>}
    </div>
  );
}
