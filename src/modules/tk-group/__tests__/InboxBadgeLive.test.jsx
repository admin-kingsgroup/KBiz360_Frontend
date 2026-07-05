import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// api/inbox pulls in core/api (Vite import.meta) → mock it for this container test.
jest.mock('../api/inbox', () => ({ getInbox: jest.fn() }));
// eslint-disable-next-line import/first
import { getInbox } from '../api/inbox';
// eslint-disable-next-line import/first
import { InboxBadgeLive } from '../InboxBadgeLive';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('InboxBadgeLive', () => {
  beforeEach(() => jest.clearAllMocks());

  test('central role with pending items shows a clickable badge', async () => {
    getInbox.mockResolvedValue({ count: 3, items: [] });
    renderWith(<InboxBadgeLive currentUser={{ role: 'Director' }} setRoute={() => {}} />);
    expect(await screen.findByRole('button', { name: /3 pending approvals/i })).toBeInTheDocument();
  });

  test('non-central role renders nothing and never polls', () => {
    const { container } = renderWith(<InboxBadgeLive currentUser={{ role: 'Branch Accountant' }} setRoute={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(getInbox).not.toHaveBeenCalled();
  });

  test('central role with an empty inbox renders nothing', async () => {
    getInbox.mockResolvedValue({ count: 0, items: [] });
    const { container } = renderWith(<InboxBadgeLive currentUser={{ role: 'Super Admin' }} setRoute={() => {}} />);
    await waitFor(() => expect(getInbox).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('clicking the badge opens the dropdown listing the pending items', async () => {
    getInbox.mockResolvedValue({ count: 2, items: [
      { _id: '1', type: 'credit_limit', branch: 'BOM', maker: { name: 'Sughra' } },
      { _id: '2', type: 'config', branch: 'AMD', maker: { name: 'Faiz' } },
    ] });
    renderWith(<InboxBadgeLive currentUser={{ role: 'Director' }} setRoute={() => {}} />);
    const btn = await screen.findByRole('button', { name: /2 pending approvals/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Credit limit')).toBeInTheDocument();   // item rendered via InboxPanel
    expect(screen.getByText(/Sughra/)).toBeInTheDocument();
  });

  test('"View all" navigates to the Approvals Inbox and closes the dropdown', async () => {
    const setRoute = jest.fn();
    getInbox.mockResolvedValue({ count: 1, items: [{ _id: '1', type: 'flag', branch: null, maker: { name: 'Faiz' } }] });
    renderWith(<InboxBadgeLive currentUser={{ role: 'Super Admin' }} setRoute={setRoute} />);
    fireEvent.click(await screen.findByRole('button', { name: /1 pending approvals/i }));
    fireEvent.click(screen.getByRole('button', { name: /view all in approvals inbox/i }));
    expect(setRoute).toHaveBeenCalledWith('/tk/approvals');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();   // dropdown closed
  });
});
