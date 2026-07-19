import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScreenBadge } from '../ScreenBadge';
import { takeSupportPrefill } from '../../core/supportPrefill';
import registry from '../../core/screenRegistry.json';

// Use a real, registered route so the test tracks the live registry.
const ROUTE = '/reports/bs';
const NO = registry.screens[ROUTE];
const props = { route: ROUTE, currentUser: { role: 'Owner', name: 'AD' }, branch: { code: 'BOM' } };

describe('ScreenBadge', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    takeSupportPrefill(); // drain any leftover prefill between tests
  });

  test('shows the stable screen number for the current route', () => {
    render(<ScreenBadge {...props} navigate={() => {}} />);
    expect(screen.getByRole('button', { name: new RegExp(`\\b${NO}\\b`) })).toBeInTheDocument();
  });

  test('copy puts a screen-tagged issue token on the clipboard', async () => {
    render(<ScreenBadge {...props} navigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`\\b${NO}\\b`) })); // open popover
    fireEvent.click(screen.getByText(/Copy report details/i));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    const token = navigator.clipboard.writeText.mock.calls[0][0];
    expect(token).toContain(`Screen #${NO}`);
    expect(token).toContain(ROUTE);
    expect(token).toContain('BOM');
  });

  test('Report seeds the support prefill and navigates to the ticket page', () => {
    const navigate = jest.fn();
    render(<ScreenBadge {...props} navigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`\\b${NO}\\b`) })); // open popover
    fireEvent.click(screen.getByText(/Report an issue/i));
    expect(navigate).toHaveBeenCalledWith('/support/tickets');
    const prefill = takeSupportPrefill();
    expect(prefill).toBeTruthy();
    expect(prefill.description).toContain(`Screen #${NO}`);
    expect(prefill.title).toContain(`#${NO}`);
    expect(prefill.route).toBe(ROUTE); // reported screen's route flows to the ticket's pageUrl
  });
});
