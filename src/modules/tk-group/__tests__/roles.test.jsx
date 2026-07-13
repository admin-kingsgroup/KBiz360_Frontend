import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyRoleView } from '../setup-roles/MyRole';

jest.mock('../api/myRole', () => ({ getMyRole: jest.fn(), getAllRoles: jest.fn() }));
// eslint-disable-next-line import/first
import { RolesResponsibilities } from '../setup-roles/RolesResponsibilities';
// eslint-disable-next-line import/first
import { getAllRoles } from '../api/myRole';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('MyRoleView (richer profile)', () => {
  test('renders mandate, responsibilities, can-approve and cannot', () => {
    render(<MyRoleView data={{
      name: 'Afshin', role: 'Super Admin', activeControls: [],
      profile: { title: 'Owner', reportsTo: null, inTkGroup: true, mandate: 'Final authority', duties: ['Approve control changes'], approves: ['Investments'], cannot: ['—'] },
    }} />);
    expect(screen.getByText('Final authority')).toBeInTheDocument();
    expect(screen.getByText('Approve control changes')).toBeInTheDocument();
    expect(screen.getByText('Investments')).toBeInTheDocument();
    expect(screen.getByText(/Can approve|You can approve/i)).toBeInTheDocument();
  });
});

describe('RolesResponsibilities (org-wide, shareable)', () => {
  test('lists every role and highlights the viewer\'s own', async () => {
    getAllRoles.mockResolvedValue({ youAre: 'Director', roles: [
      { key: 'Owner', title: 'Owner · Super Admin', person: 'Afshin', reportsTo: null, inTkGroup: true, mandate: 'Final authority', duties: [], approves: [], cannot: [] },
      { key: 'Director', title: 'Director', person: 'Farhan', reportsTo: 'Owner', inTkGroup: true, mandate: 'Decision gateway', duties: [], approves: [], cannot: [] },
    ] });
    renderWith(<RolesResponsibilities />);
    expect(await screen.findByText('Director')).toBeInTheDocument();
    expect(screen.getByText('Owner · Super Admin')).toBeInTheDocument();
    expect(screen.getByText('THIS IS YOU')).toBeInTheDocument();  // Director highlighted
  });
});
