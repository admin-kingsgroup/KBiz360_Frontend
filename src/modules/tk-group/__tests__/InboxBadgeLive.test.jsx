import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
});
