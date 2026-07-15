// Name Matcher pane — renders the paired orphans from real tie-out rows. Confirms
// the component wiring (imports, primitives, currency format) beyond the pure
// matcher's unit tests.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NameMatcherPane } from '../NameMatcherPane';

const rows = [
  { status: 'only-erp', erpLedger: 'TDS Payable [BOM]', code: 'BOM-AUTO-TDS Payable', erp: -8330, group: 'TDS & TCS' },
  { status: 'only-erp', erpLedger: 'IT-SVC2', code: 'AUTO-IT-Other Taxes', erp: -2155.94, group: 'International Flights' },
  { status: 'only-erp', erpLedger: 'SVC2 CGST Output [BOM]', code: 'BOM-OTHER-TAXES-CGST-OUTPUT', erp: -315, group: 'Duties & Taxes' },
  { status: 'only-tally', tallyLedger: '194J-TDS on Professional Fees', tally: -7878 },
  { status: 'only-tally', tallyLedger: '194C-TDS on Contract [Non.Co]', tally: -452 },
  { status: 'only-tally', tallyLedger: 'IT-Other Taxes', tally: 1007.99 },
  { status: 'only-tally', tallyLedger: 'CGST Purchase', tally: 4098.42 },
];

describe('<NameMatcherPane>', () => {
  test('renders the split, the code-hint pair, the structural none, and the unmatched-Tally panel', () => {
    render(<NameMatcherPane rows={rows} cur="₹" />);

    // summary line
    expect(screen.getByText(/in ERP with no Tally name/i)).toBeInTheDocument();

    // TDS split → both section ledgers shown
    expect(screen.getByText('194J-TDS on Professional Fees')).toBeInTheDocument();
    expect(screen.getByText('194C-TDS on Contract [Non.Co]')).toBeInTheDocument();
    expect(screen.getAllByText(/Split in Tally/i).length).toBeGreaterThan(0);

    // IT-SVC2 code-hint pair
    expect(screen.getByText('IT-Other Taxes')).toBeInTheDocument();
    expect(screen.getAllByText(/Renamed · code match/i).length).toBeGreaterThan(0);

    // structural ERP-only head
    expect(screen.getByText('SVC2 CGST Output [BOM]')).toBeInTheDocument();
    expect(screen.getAllByText(/No Tally twin/i).length).toBeGreaterThan(0);

    // Two side-sections; CGST Purchase (no ERP twin) sits under "Not in ERP".
    expect(screen.getByText('Not in ERP')).toBeInTheDocument();
    expect(screen.getByText('Not in Tally')).toBeInTheDocument();
    expect(screen.getByText('CGST Purchase')).toBeInTheDocument();
  });

  test('empty state when there are no orphans', () => {
    render(<NameMatcherPane rows={[{ status: 'tied', ledger: 'Cash', erp: 100, tally: 100 }]} cur="₹" />);
    expect(screen.getByText(/Every ledger has a name on both sides/i)).toBeInTheDocument();
  });
});
