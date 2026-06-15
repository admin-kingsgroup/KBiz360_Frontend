// The provenance badge: ERP (muted), BU/MN (bold), plus the 🔒 lock.
// api.js uses import.meta.env (not available under jest) — stub it; the badge
// components under test don't hit the network anyway.
jest.mock('../api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), getAuthToken: () => 'tok' }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SourceBadge, LedgerLabel } from '../LedgerLabel';

describe('SourceBadge', () => {
  test('renders ERP for system/auto', () => {
    render(<SourceBadge source="system" />);
    expect(screen.getByText('ERP')).toBeInTheDocument();
  });
  test('renders BU for import (bulk upload)', () => {
    render(<SourceBadge source="import" />);
    const el = screen.getByText('BU');
    expect(el).toBeInTheDocument();
    expect(Number(getComputedStyle(el).fontWeight)).toBeGreaterThanOrEqual(700); // bold
  });
  test('renders MN for manual', () => {
    render(<SourceBadge source="manual" />);
    expect(screen.getByText('MN')).toBeInTheDocument();
  });
});

describe('LedgerLabel', () => {
  test('shows name + lock + source badge when locked tax ledger', () => {
    render(<LedgerLabel name="CGST Output [BOM]" source="system" locked />);
    expect(screen.getByText(/CGST Output \[BOM\]/)).toBeInTheDocument();
    expect(screen.getByText('🔒')).toBeInTheDocument();
    expect(screen.getByText('ERP')).toBeInTheDocument();
  });
  test('manual ledger → MN badge, no lock', () => {
    render(<LedgerLabel name="Sales — Hotel [BOM]" source="manual" locked={false} />);
    expect(screen.getByText('MN')).toBeInTheDocument();
    expect(screen.queryByText('🔒')).toBeNull();
  });
});
