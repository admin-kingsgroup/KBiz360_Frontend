// Governance & Exceptions wrapper — ONE destination, TWO views (Approvals & Audit | Alerts).
// Consolidation (2026-07): the two governance surfaces became one board. The `view` prop
// (derived from the active route in App.jsx) selects which sub-view renders; the toggle
// navigates between /dashboards/audit and /dashboard/alerts. Sub-views are stubbed so this
// pins the wrapper's switch/route logic alone.
jest.mock('../pages/alerts-dashboard', () => ({ AlertsDashboard: () => <div>ALERTS_BOARD</div> }));
jest.mock('../director/directorDash', () => ({ ApprovalsAuditDash: () => <div>APPROVALS_BOARD</div> }));

import { render, screen, fireEvent } from '@testing-library/react';
import { GovernanceBoard } from '../pages/governance';

describe('Governance & Exceptions — one destination, two views', () => {
  test('view="approvals" renders the Approvals & Audit board (tab selected)', () => {
    render(<GovernanceBoard view="approvals" setRoute={jest.fn()} />);
    expect(screen.getByText('APPROVALS_BOARD')).toBeInTheDocument();
    expect(screen.queryByText('ALERTS_BOARD')).toBeNull();
    expect(screen.getByRole('tab', { name: /Approvals & Audit/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('view="alerts" renders the Alerts board (tab selected)', () => {
    render(<GovernanceBoard view="alerts" setRoute={jest.fn()} />);
    expect(screen.getByText('ALERTS_BOARD')).toBeInTheDocument();
    expect(screen.queryByText('APPROVALS_BOARD')).toBeNull();
    expect(screen.getByRole('tab', { name: /Alerts/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('defaults to Approvals when no view given', () => {
    render(<GovernanceBoard setRoute={jest.fn()} />);
    expect(screen.getByText('APPROVALS_BOARD')).toBeInTheDocument();
  });

  test('the toggle navigates to the INACTIVE view (active tab is a no-op)', () => {
    const setRoute = jest.fn();
    // From Approvals, the Alerts tab navigates; from Alerts, the Approvals tab navigates.
    const { rerender } = render(<GovernanceBoard view="approvals" setRoute={setRoute} />);
    fireEvent.click(screen.getByRole('tab', { name: /Alerts/i }));
    expect(setRoute).toHaveBeenCalledWith('/dashboard/alerts');
    rerender(<GovernanceBoard view="alerts" setRoute={setRoute} />);
    fireEvent.click(screen.getByRole('tab', { name: /Approvals & Audit/i }));
    expect(setRoute).toHaveBeenCalledWith('/dashboards/audit');
  });
});
