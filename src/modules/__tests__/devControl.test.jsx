// Developer Control Tower (/dev/control) — Super-Admin-only engineering console,
// built like the TK Control Tower: pending-from-developer findings board with
// per-item tracking (owner/status/due via /api/dev-control). Locks in:
// (1) the component's own role gate, (2) the board + KPI render, (3) registry
// integrity incl. unique tracking ids, (4) the nav pill exists ONLY for Super Admin.

// core/api uses import.meta (no babel plugin under jest) — mock it like every
// other suite that touches API-adjacent modules.
jest.mock('../../core/api', () => ({
  getAuthToken: jest.fn(() => 'open'),
  API_BASE: 'http://localhost:9090',
  apiGet: jest.fn(async () => ({ items: [] })),
  apiPost: jest.fn(async () => ({})),
  apiPut: jest.fn(), apiDelete: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DevControlPage } from '../devControl';
import { DEV_REGISTRY, ALL_ITEMS, STATUS_META, TRACK_META } from '../devControl/registry';
import { fullMenuRoots, MENU_DEV_CONTROL } from '../../core/menus';

const renderPage = (user) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DevControlPage currentUser={user} setRoute={() => {}} />
    </QueryClientProvider>,
  );
};

describe('DevControlPage — Super-Admin gate', () => {
  test('non-Super-Admin sees the lock card, not the board', () => {
    renderPage({ role: 'Director', email: 'x@y.com' });
    expect(screen.getByText(/restricted to the Super Admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pending from the developer/i)).not.toBeInTheDocument();
  });

  test('Super Admin sees the tower: KPIs, board, areas, runbook', () => {
    renderPage({ role: 'Super Admin', email: 'x@y.com' });
    expect(screen.getAllByText(/ERP completion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pending from the developer/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Area readiness — worst first/i)).toBeInTheDocument();
    expect(screen.getByText(/Live API wiring check/i)).toBeInTheDocument();
    expect(screen.getByText(/Script runbook/i)).toBeInTheDocument();
    // every not-yet-live item is a finding on the board
    const pendingCount = ALL_ITEMS.filter((i) => i.status !== 'live').length;
    expect(pendingCount).toBeGreaterThan(0);
    expect(screen.getByText(ALL_ITEMS.find((i) => i.status !== 'live').name)).toBeInTheDocument();
  });
});

describe('registry integrity', () => {
  test('every item has a known status and a unique stable id', () => {
    const ids = new Set();
    for (const area of DEV_REGISTRY) {
      for (const item of area.items) {
        expect(Object.keys(STATUS_META)).toContain(item.status);
        expect(item.name).toBeTruthy();
        expect(item.id).toBeTruthy();
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
      }
    }
    expect(ids.size).toBe(ALL_ITEMS.length);
  });

  test('tracking statuses cover the workflow incl. terminal states', () => {
    expect(Object.keys(TRACK_META)).toEqual(expect.arrayContaining(['open', 'in-progress', 'done', 'wont-do']));
  });
});

describe('nav pill — Super Admin only', () => {
  const hrefs = (user) => fullMenuRoots('ALL', user).map((p) => p && p.href).filter(Boolean);
  test('Super Admin gets the Dev Control pill', () => {
    expect(hrefs({ role: 'Super Admin' })).toContain(MENU_DEV_CONTROL.href);
  });
  test('Director / other full-menu roles do NOT', () => {
    expect(hrefs({ role: 'Director' })).not.toContain(MENU_DEV_CONTROL.href);
    expect(hrefs({ role: 'General Manager' })).not.toContain(MENU_DEV_CONTROL.href);
  });
});
