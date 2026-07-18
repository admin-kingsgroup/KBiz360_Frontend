// Owner Cockpit wrapper — ONE destination, TWO views (Overview | Cockpit).
// Consolidation (2026-07): AD Dashboard (All) + AD Cockpit became one board. The
// `view` prop (derived from the active route in App.jsx) selects which board renders;
// the always-visible toggle navigates between /dashboard/owner and /dashboard/cockpit.
// The two heavy pages are stubbed so this pins the wrapper's switch/route logic alone.
jest.mock('../pages/owner-dashboard', () => ({ OwnerDashboardPage: () => <div>OVERVIEW_BOARD</div> }));
jest.mock('../pages/ad-cockpit', () => ({ AdCockpitPage: () => <div>COCKPIT_BOARD</div> }));

import { render, screen, fireEvent } from '@testing-library/react';
import { OwnerCockpitPage } from '../pages/owner-cockpit';

describe('Owner Cockpit — one destination, two views', () => {
  test('view="overview" renders the Overview board + both toggle tabs (Overview selected)', () => {
    render(<OwnerCockpitPage view="overview" setRoute={jest.fn()} />);
    expect(screen.getByText('OVERVIEW_BOARD')).toBeInTheDocument();
    expect(screen.queryByText('COCKPIT_BOARD')).toBeNull();
    expect(screen.getByRole('tab', { name: /Overview/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Cockpit/i })).toHaveAttribute('aria-selected', 'false');
  });

  test('view="cockpit" renders the Cockpit board (Cockpit selected)', () => {
    render(<OwnerCockpitPage view="cockpit" setRoute={jest.fn()} />);
    expect(screen.getByText('COCKPIT_BOARD')).toBeInTheDocument();
    expect(screen.queryByText('OVERVIEW_BOARD')).toBeNull();
    expect(screen.getByRole('tab', { name: /Cockpit/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('defaults to Overview when no view prop is passed', () => {
    render(<OwnerCockpitPage setRoute={jest.fn()} />);
    expect(screen.getByText('OVERVIEW_BOARD')).toBeInTheDocument();
  });

  test('the toggle navigates: Cockpit → /dashboard/cockpit, Overview → /dashboard/owner', () => {
    const setRoute = jest.fn();
    render(<OwnerCockpitPage view="overview" setRoute={setRoute} />);
    fireEvent.click(screen.getByRole('tab', { name: /Cockpit/i }));
    expect(setRoute).toHaveBeenCalledWith('/dashboard/cockpit');
    fireEvent.click(screen.getByRole('tab', { name: /Overview/i }));
    expect(setRoute).toHaveBeenCalledWith('/dashboard/owner');
  });
});
