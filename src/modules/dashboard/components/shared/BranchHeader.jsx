import React from 'react';
import { Plus } from 'lucide-react';
import { btnG, btnGh } from '../../../../core/styles';
import { useMobile } from '../../../../core/hooks';

export function BranchHeader({ branch, branchCode, isIndia, bookingsCount, onNavigate }) {
  const mob = useMobile();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: mob ? 16 : 20, fontWeight: 800, color: '#0d1326' }}>
          {branch === 'ALL' ? 'Group Dashboard' : 'Branch Dashboard'} — {branchCode || 'Travkings Group'}
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691' }}>
          May 2026 · Live data from {bookingsCount} bookings · {isIndia ? 'GST Regime' : 'VAT Regime'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onNavigate('/sales/flight')} style={{ ...btnG, fontSize: 11, background: '#185FA5' }}>
          <Plus size={13} /> New Sale
        </button>
        <button onClick={() => onNavigate('/receipts')} style={{ ...btnG, fontSize: 11, background: '#27500A' }}>
          <Plus size={13} /> Receipt
        </button>
        <button onClick={() => onNavigate('/reports/pnl')} style={{ ...btnGh, fontSize: 11 }}>
          P&amp;L →
        </button>
      </div>
    </div>
  );
}
