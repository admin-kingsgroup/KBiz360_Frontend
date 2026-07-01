// Render-proof (smoke test) for the CONSOLIDATED Receivables ageing screen:
// renders the REAL ReceivablesLive component with an all-branches `byBranch` payload
// (BOM in ₹, NBO in $) and confirms it draws a SEPARATE section per branch, each in
// its own currency, with NO merged cross-branch total. The heavy sibling modules the
// legacy file imports are stubbed so the component itself runs unchanged.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../../../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }), { virtual: true });
jest.mock('../../accountingLive', () => ({ VoucherEditor: () => null }));
jest.mock('../../outstanding', () => ({ OutstandingOnAccount: () => null }));
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
// Branch currency: NBO = USD ($), everyone else INR (₹). This is the crux of the proof.
jest.mock('../../../core/styles', () => ({
  card: {}, inp: {},
  bc: (b) => { const c = b && b.code ? b.code : b; return { cur: c === 'NBO' ? '$' : '₹' }; },
}));

// Two-branch consolidated ageing payload (what the backend `byBranch` returns on ALL).
// Defined INSIDE the factory — jest.mock factories may not close over outer variables.
jest.mock('../../../core/useAccounting', () => {
  const side = (party, total) => ({
    rows: [{ party, d0: total, d30: 0, d60: 0, d90: 0, total, onAccount: 0, net: total, billed: total, settled: 0 }],
    totals: { d0: total, d30: 0, d60: 0, d90: 0, total, onAccount: 0, net: total, billed: total, settled: 0 },
  });
  const empty = { rows: [], totals: { d0: 0, d30: 0, d60: 0, d90: 0, total: 0, onAccount: 0, net: 0, billed: 0, settled: 0 } };
  const AGE_ALL = {
    asOf: '2026-06-27',
    receivables: side('MERGED', 1500), payables: empty,
    byBranch: [
      { branch: 'BOM', receivables: side('Inaysha Holidays', 1000), payables: empty },
      { branch: 'NBO', receivables: side('Aamir Travel', 500), payables: empty },
    ],
  };
  return {
    branchCode: (b) => (b === 'ALL' || !b ? '' : (b.code || b)),
    // Consolidated call (ALL / '') → byBranch; a per-branch child call → that branch only (no byBranch).
    useAgeing: (b) => {
      const c = b && b.code ? b.code : b;
      if (!c || c === 'ALL') return { data: AGE_ALL, isLoading: false };
      const hit = AGE_ALL.byBranch.find((x) => x.branch === c);
      return { data: hit ? { asOf: AGE_ALL.asOf, receivables: hit.receivables, payables: hit.payables } : { asOf: AGE_ALL.asOf, receivables: empty, payables: empty }, isLoading: false };
    },
    useModulePL: () => ({ data: {} }), useBalanceSheet: () => ({ data: {} }), useLedgerStatement: () => ({ data: {} }),
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReceivablesLive } from '../legacy';

describe('Consolidated Receivables ageing — renders branch-wise (smoke)', () => {
  test('All-Branches shows a SEPARATE section per branch, each in its own currency, no merged total', () => {
    render(<ReceivablesLive branch="ALL" setRoute={() => {}} />);

    // Consolidated header makes the rule explicit.
    expect(screen.getByText(/All Branches/i)).toBeInTheDocument();
    expect(screen.getByText(/no cross-currency total/i)).toBeInTheDocument();

    // A labelled section for EACH branch.
    expect(screen.getByText('BOM')).toBeInTheDocument();
    expect(screen.getByText('NBO')).toBeInTheDocument();

    // Each branch's own party row (proves per-branch data, not merged).
    expect(screen.getByText('Inaysha Holidays')).toBeInTheDocument();
    expect(screen.getByText('Aamir Travel')).toBeInTheDocument();

    // The NBO section renders money in USD ($); the merged figure ($/₹1,500) never appears.
    expect(screen.getAllByText((t) => t.includes('$')).length).toBeGreaterThan(0);
    expect(screen.queryByText('MERGED')).toBeNull();
    expect(screen.queryByText((t) => t.replace(/[^\d]/g, '') === '1500')).toBeNull();
  });
});
