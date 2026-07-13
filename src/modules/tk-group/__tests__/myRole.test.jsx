import React from 'react';
import { render, screen } from '@testing-library/react';

// api/myRole pulls in core/api (Vite import.meta) which Jest can't parse — mock it
// so only the presentational MyRoleView is exercised here.
jest.mock('../api/myRole', () => ({ getMyRole: jest.fn().mockResolvedValue(null) }));

// eslint-disable-next-line import/first
import { MyRoleView } from '../setup-roles/MyRole';

const data = {
  name: 'Farhan Aga', role: 'Director',
  profile: { title: 'Director', reportsTo: 'Owner', act: 'You propose; the Owner disposes.', duties: ['Approve onboarding & credit', 'Does NOT approve the transaction books'] },
  activeControls: ['core.policy_guard'],
};

describe('MyRoleView', () => {
  test('loading state when no data', () => {
    render(<MyRoleView data={null} />);
    expect(screen.getByText(/Loading your role/)).toBeInTheDocument();
  });

  test('renders name, title, reports-to, duties, and active controls', () => {
    render(<MyRoleView data={data} />);
    expect(screen.getByText('Farhan Aga')).toBeInTheDocument();
    expect(screen.getByText(/Director · reports to Owner/)).toBeInTheDocument();
    expect(screen.getByText(/You propose/)).toBeInTheDocument();
    expect(screen.getByText(/Does NOT approve the transaction books/)).toBeInTheDocument();
    expect(screen.getByTestId('tk-active-controls')).toHaveTextContent('core.policy_guard');
  });

  test('no controls → shows dormant', () => {
    render(<MyRoleView data={{ ...data, activeControls: [] }} />);
    expect(screen.getByTestId('tk-active-controls')).toHaveTextContent('none yet (dormant)');
  });
});
