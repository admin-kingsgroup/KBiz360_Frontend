import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api/monitor', () => ({ getAudit: jest.fn() }));
// eslint-disable-next-line import/first
import { ChangeLog } from '../ChangeLog';
// eslint-disable-next-line import/first
import { getAudit } from '../api/monitor';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ChangeLog', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renders real audit events (flag/limit changes) and hides guard.allow noise', async () => {
    getAudit.mockResolvedValue({ items: [
      { _id: '1', ts: '2026-07-11T09:00:00', actor: { name: 'Afshin', role: 'Super Admin' }, action: 'flag.set', entity: { kind: 'flag', id: 'entry.mandatory_docs' }, branch: 'BOM', before: { enabled: false }, after: { enabled: true } },
      { _id: '2', ts: '2026-07-11T09:01:00', actor: { name: 'Afshin' }, action: 'limits.set', entity: { kind: 'limits', id: 'BOM' }, branch: 'BOM' },
      { _id: '3', ts: '2026-07-11T09:02:00', actor: { name: 'sys' }, action: 'guard.allow', entity: {} },  // noise → hidden
    ] });
    renderWith(<ChangeLog go={() => {}} />);
    expect(await screen.findByText('Control flag')).toBeInTheDocument();
    expect(screen.getByText('Threshold')).toBeInTheDocument();
    expect(screen.getByText(/entry\.mandatory_docs/)).toBeInTheDocument();
    expect(screen.getByText(/enabled: false → enabled: true/)).toBeInTheDocument();  // before → after
    // guard.allow is filtered out
    expect(screen.queryByText('guard.allow')).not.toBeInTheDocument();
  });

  test('empty trail shows a friendly placeholder', async () => {
    getAudit.mockResolvedValue({ items: [] });
    renderWith(<ChangeLog />);
    expect(await screen.findByText(/No control changes recorded yet/)).toBeInTheDocument();
  });
});
