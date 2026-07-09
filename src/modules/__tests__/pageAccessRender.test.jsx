// Render smoke-test for the Page Visibility Control screen. This screen is lazy-
// loaded and had no test, so a used-but-unimported symbol (e.g. ResponsiveGrid)
// slipped past the suite AND the syntax check and only blew up in the browser
// (ReferenceError at runtime). This test actually MOUNTS the admin view — user
// selected → sticky bar + Branch-access card (ResponsiveGrid) + the grouped page
// catalogue — so any missing import throws here instead of in production.
// (jest.mock factories may only reference vars prefixed `mock`.)
const mockUsers = [
  { id: 'u1', email: 'clerk@travkings.com', name: 'Clerk One', role: 'Branch Accountant', branches: ['BOM'], hidden: [], granted: [] },
];

jest.mock('../../core/useReference', () => ({ useUsersAdmin: () => ({ data: mockUsers }) }));
jest.mock('../../core/api', () => ({ apiPut: jest.fn(), apiPost: jest.fn() }));
jest.mock('../../core/ux/toast', () => ({ toast: jest.fn() }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageAccessControl } from '../settings/pageAccess';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

// isPageAccessAdmin is email-gated to afshin — render as him so we get the full UI.
const AFSHIN = { email: 'afshin.dhanani@kingsgroupco.com', role: 'Super Admin' };

describe('PageAccessControl renders without runtime errors', () => {
  test('admin view mounts; selecting a user shows the branch card + grouped catalogue', () => {
    wrap(<PageAccessControl currentUser={AFSHIN} setRoute={() => {}} />);

    // Pick the user → this is the render path that instantiates ResponsiveGrid
    // (Branch access card) and the groupItems() sub-grouped page list.
    fireEvent.click(screen.getByRole('button', { name: /Clerk One/i }));

    // Branch-access card (uses ResponsiveGrid) rendered → import resolves.
    expect(screen.getByText('Branch access')).toBeInTheDocument();

    // Sections start COLLAPSED (clean + fast), so the Masters section header shows
    // but its sub-group "Client Master" is NOT mounted yet. (Negative lookahead
    // excludes the separate "Masters & Ledger" section, which also starts with
    // "Masters".)
    const mastersHeader = screen.getByRole('button', { name: /^Masters(?!\s*&)/ });
    expect(screen.queryByText('Client Master')).toBeNull();

    // One click expands it → the nav sub-group header renders (groupItems ran).
    fireEvent.click(mastersHeader);
    expect(screen.getByText('Client Master')).toBeInTheDocument();

    // One click collapses it again (single-click, no double-toggle).
    fireEvent.click(mastersHeader);
    expect(screen.queryByText('Client Master')).toBeNull();
  });

  test('Expand all / Collapse all flips every section at once', () => {
    wrap(<PageAccessControl currentUser={AFSHIN} setRoute={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Clerk One/i }));

    // Default collapsed → expand all → a deep sub-group is now visible.
    fireEvent.click(screen.getByRole('button', { name: /^Expand all$/ }));
    expect(screen.getByText('Client Master')).toBeInTheDocument();

    // Collapse all → gone again.
    fireEvent.click(screen.getByRole('button', { name: /^Collapse all$/ }));
    expect(screen.queryByText('Client Master')).toBeNull();
  });
});
