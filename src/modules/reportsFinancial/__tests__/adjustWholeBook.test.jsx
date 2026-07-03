// "Adjust ▸" on the Receivables ageing must open the Outstanding & On-Account
// view UNSCOPED by side — all four buckets (on-account receipts incl. RF/ACM
// AND payments) stay reachable — but FOCUSED on the clicked party, so the
// window shows only that customer's vouchers ("show all parties" clears it).
// Lands on the On-Account Receipts tab.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }), { virtual: true });
jest.mock('../../accountingLive', () => ({ VoucherEditor: () => null }));
jest.mock('../../../core/exportExcel', () => ({ exportToExcel: jest.fn() }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../../core/ledgerActions', () => ({ LedgerActions: () => null }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/modalStore', () => ({ pushModal: jest.fn() }));
jest.mock('../../../core/LedgerModalHost', () => ({ openLedgerModal: jest.fn() }));
jest.mock('../../../core/hooks', () => ({ useMobile: () => false, useBgtRefresh: () => {} }));
jest.mock('../../../core/pnlDetail', () => ({
  moduleDrillRows: () => [], moduleExpandKeys: () => [], moduleDetailKey: () => '',
  moduleHasDetail: () => false, stripLeafPrefix: (s) => s, moduleSideRows: () => [],
}));
jest.mock('@tanstack/react-query', () => ({ ...jest.requireActual('@tanstack/react-query'), useQueries: () => [] }));
jest.mock('../../../core/styles', () => ({ card: {}, inp: {}, bc: () => ({ cur: '₹' }) }));

// Probe: capture the props ArApScreen passes to the Settle tab's screen.
const outstandingProps = [];
jest.mock('../outstanding', () => ({
  OutstandingOnAccount: (props) => { outstandingProps.push(props); return <div>OUTSTANDING-PROBE</div>; },
}));

jest.mock('../../../core/useAccounting', () => {
  const row = { party: 'Travkings Tours and Travels DAR', d0: 0, d30: 0, d60: 0, d90: 0, total: 712153, onAccount: 364890, net: 347263, billed: 712153, settled: 0 };
  const side = { rows: [row], totals: { ...row } };
  const empty = { rows: [], totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 0, onAccount: 0, net: 0, billed: 0, settled: 0 } };
  return {
    branchCode: (b) => (b === 'ALL' || !b ? '' : (b.code || b)),
    useAgeing: () => ({ data: { asOf: '2026-07-03', receivables: side, payables: empty }, isLoading: false }),
    useModulePL: () => ({ data: {} }), useBalanceSheet: () => ({ data: {} }), useLedgerStatement: () => ({ data: {} }),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReceivablesLive } from '../legacy';

describe('Adjust ▸ → whole-book Outstanding & On-Account', () => {
  test('clicking Adjust opens the Settle tab side-unscoped but focused on the clicked party', () => {
    render(<ReceivablesLive branch="BOM" setRoute={() => {}} />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText('Adjust ▸'));

    expect(screen.getByText('OUTSTANDING-PROBE')).toBeInTheDocument();
    const p = outstandingProps[outstandingProps.length - 1];
    expect(p.side).toBeUndefined();          // all four buckets — receipts AND payments
    expect(p.initialParty).toBe('Travkings Tours and Travels DAR'); // ONLY the clicked party's vouchers
    expect(p.initialTab).toBe('recAdv');     // lands on On-Account Receipts
  });
});
