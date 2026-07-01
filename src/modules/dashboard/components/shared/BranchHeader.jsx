import React from 'react';
import { Plus } from 'lucide-react';
import { CUR_MONTH_LABEL } from '../../../../core/dates';
import { CONSOLIDATED_LABEL } from '../../../../core/data';
import { Button } from '../../../../shell/primitives';

export function BranchHeader({ branch, branchCode, isIndia, bookingsCount, onNavigate }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="kbiz-page-title truncate">
          {branch === 'ALL' ? 'Group Dashboard' : 'Branch Dashboard'} — {branchCode || CONSOLIDATED_LABEL}
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          {CUR_MONTH_LABEL} · Live data from {bookingsCount} bookings · {isIndia ? 'GST Regime' : 'VAT Regime'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="primary" icon={Plus} onClick={() => onNavigate('/bookings/new')}>New Sale</Button>
        <Button size="sm" variant="success" icon={Plus} onClick={() => onNavigate('/receipts')}>Receipt</Button>
        <Button size="sm" variant="secondary" onClick={() => onNavigate('/reports/pnl')}>P&amp;L →</Button>
      </div>
    </div>
  );
}
