import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// core/api reads import.meta.env (Vite-only) — mock it so the module graph loads under jest,
// mirroring src/modules/__tests__/pageAccessRender.test.jsx. The WHT hook calls apiGet.
jest.mock('../../../core/api', () => ({
  apiGet: jest.fn(() => Promise.resolve({ rows: [], totals: { payable: 0, receivable: 0 } })),
  apiPut: jest.fn(), apiPost: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => ''),
}));

import { TaxTdsTcs } from './taxTdsTcs';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (ui) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

// The "Withholding Tax" menu (/tax/tds) must be regime-aware: Africa (VAT) branches
// get a WHT register in their own currency, NOT the India TDS/TCS 194C/26Q/206C screen.
describe('Withholding Tax menu is regime-aware', () => {
  test('Africa (NBO) shows the WHT register — no India TDS / 206C / 26Q framing', () => {
    wrap(<TaxTdsTcs branch={{ code: 'NBO' }} />);
    expect(screen.getByText(/Withholding Tax \(WHT\) Register/i)).toBeTruthy();
    expect(screen.getByText(/WHT Payable \(we withheld\)/i)).toBeTruthy();
    // USD books bill to the CENT — amounts must show 2dp, not be rounded to whole dollars.
    // Both the Payable and Receivable tiles render it, hence getAllByText.
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0);
    expect(screen.queryByText(/206C/)).toBeNull();
    expect(screen.queryByText(/26Q/)).toBeNull();
    expect(screen.queryByText(/TDS \/ TCS Register/i)).toBeNull();
  });
});
