import React from 'react';

const ITEM_LABELS = { receivable: 'invoices', payable: 'bills' };

export function AgeingBuckets({ buckets, kind = 'receivable', formatMoney, scale = 1, condensed = false }) {
  const itemLabel = ITEM_LABELS[kind] || 'items';
  return (
    <>
      {buckets.map((b) => (
        <div key={b.bucket} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: condensed ? 26 : 30, background: b.color, borderRadius: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#0d1326', fontWeight: 600 }}>{b.bucket}</p>
            {!condensed && <p style={{ margin: 0, fontSize: 9.5, color: '#5a6691' }}>{b.count} {itemLabel}</p>}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: condensed ? 11.5 : 12,
              fontWeight: 700,
              color: '#0d1326',
              fontFamily: 'monospace',
            }}
          >
            {formatMoney(Math.round(b.amount * scale))}
          </p>
        </div>
      ))}
    </>
  );
}
