// UI/UX hardening regression tests for the dashboard module.
// Covers: shared error state, branch-aware currency, non-colour status cues,
// table header semantics (scope=col) and empty/guard states.
import { render, screen, fireEvent } from '@testing-library/react';
import { compactAmt } from '../../../core/format';
import { DashboardError } from '../../../core/ux/DashboardError';
import { BankReconStatusPanel } from '../components/shared/BankReconStatusPanel';
import { GstrFilingPanel } from '../components/shared/GstrFilingPanel';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';
import { PeriodCloseTable } from '../components/tables/PeriodCloseTable';
import { TodayVouchersTable } from '../components/tables/TodayVouchersTable';
import { TopEntitiesTable } from '../components/tables/TopEntitiesTable';
import { TopVendorsOverdueTable } from '../components/tables/TopVendorsOverdueTable';
import { RecentActivityFeed } from '../components/shared/RecentActivityFeed';
import { ActionItemsPanel } from '../components/shared/ActionItemsPanel';

describe('DashboardError — shared failure state', () => {
  test('shows the title, the error detail and a working Retry button', () => {
    const onRetry = jest.fn();
    render(<DashboardError error={new Error('Network down')} onRetry={onRetry} title="Could not load X." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load X.')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('renders without a Retry button when onRetry is omitted', () => {
    render(<DashboardError error="boom" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('compactAmt — branch-aware currency (the mechanism the pages use)', () => {
  test('uses the supplied currency symbol, not a hardcoded ₹', () => {
    expect(compactAmt(2500000, { currency: '$' })).toBe('$25.00L');
    expect(compactAmt(2500000, { currency: '₹' })).toBe('₹25.00L');
    expect(compactAmt(500, { currency: '$' })).toBe('$500');
  });
});

describe('BankReconStatusPanel — status not signalled by colour alone', () => {
  test('prepends an icon and keeps the status word', () => {
    render(<BankReconStatusPanel rows={[{ bank: 'ICICI', matched: 9, unmatched: 1, status: 'Behind' }]} />);
    expect(screen.getByText('Behind')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();      // icon cue
    expect(screen.getByText('1 unmatched')).toBeInTheDocument();
  });
});

describe('GstrFilingPanel — filed/not-filed has an icon cue', () => {
  test('shows ✓ for filed and ✗ for unfiled returns', () => {
    render(<GstrFilingPanel rows={[{ entity: 'TK BOM', net: 1000, gstin: '27ABC', gstr1: 'Filed', gstr3b: 'Pending', due: '20-Jul' }]} />);
    expect(screen.getByText(/GSTR-1:/)).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });
  test('empty rows render a friendly message', () => {
    render(<GstrFilingPanel rows={[]} />);
    expect(screen.getByText(/No GST return due/i)).toBeInTheDocument();
  });
});

describe('FyTargetsPanel — progress has a text band, not only a coloured bar', () => {
  test('labels the tracking band in words', () => {
    render(<FyTargetsPanel targets={[
      { metric: 'Sales', actual: 95, target: 100, unit: '₹' },
      { metric: 'GP', actual: 30, target: 100, unit: '₹' },
    ]} />);
    expect(screen.getByText('On track')).toBeInTheDocument(); // 95%
    expect(screen.getByText('Behind')).toBeInTheDocument();   // 30%
  });
});

describe('Tables — header semantics + empty/guard states', () => {
  test('PeriodCloseTable headers carry scope="col" and tolerate undefined rows', () => {
    const { container } = render(<PeriodCloseTable rows={undefined} />);
    expect(container.querySelectorAll('th[scope="col"]').length).toBe(5);
  });

  test('TodayVouchersTable headers carry scope and shows an empty-state row', () => {
    const { container } = render(<TodayVouchersTable data={{}} />);
    expect(container.querySelectorAll('th[scope="col"]').length).toBe(5);
    expect(screen.getByText(/No vouchers posted today/i)).toBeInTheDocument();
  });

  test('TopEntitiesTable shows an empty-state message instead of a blank table', () => {
    render(<TopEntitiesTable rows={[]} kind="customer" />);
    expect(screen.getByText(/No customers for this period/i)).toBeInTheDocument();
  });
});

describe('Currency threading — internal panels honour a branch-aware formatMoney', () => {
  const usd = (n) => `$${n}`;

  test('TopEntitiesTable renders amounts via the supplied formatter (not ₹)', () => {
    render(<TopEntitiesTable rows={[{ name: 'Acme', revenue: 42, bookings: 2, branch: 'NBO', share: 10 }]} kind="customer" formatMoney={usd} />);
    expect(screen.getByText('$42')).toBeInTheDocument();
  });

  test('TodayVouchersTable totals use the supplied formatter', () => {
    render(<TodayVouchersTable data={{ NBO: { receipt: 1, payment: 0, journal: 0, value: 99 } }} formatMoney={usd} />);
    expect(screen.getByText('$99')).toBeInTheDocument();
  });

  test('TopVendorsOverdueTable amounts use the supplied formatter', () => {
    render(<TopVendorsOverdueTable suppliers={[{ name: 'V1', overdueDays: 90, overdueAmount: 77 }]} formatMoney={usd} />);
    expect(screen.getByText('$77')).toBeInTheDocument();
  });

  test('RecentActivityFeed amounts use the supplied formatter', () => {
    render(<RecentActivityFeed entries={[{ action: 'Payment', amount: 55, vendor: 'X', ts: 'now' }]} formatMoney={usd} />);
    expect(screen.getByText('$55')).toBeInTheDocument();
  });

  test('defaults to ₹ when no formatter is passed (back-compat)', () => {
    render(<RecentActivityFeed entries={[{ action: 'Payment', amount: 1500, vendor: 'X', ts: 'now' }]} />);
    expect(screen.getByText(/₹/)).toBeInTheDocument();
  });
});

describe('Semantic headings — panel titles are real headings', () => {
  test('ActionItemsPanel title is an <h3> reachable by role', () => {
    render(<ActionItemsPanel items={[]} />);
    expect(screen.getByRole('heading', { name: /Today's Action Items/i })).toBeInTheDocument();
  });
});
