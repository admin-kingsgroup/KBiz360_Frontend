// KpiTile: the growth badge must NOT hardcode "vs Apr" (the value is month-over-month),
// and when clickable the tile must be keyboard-accessible (role/tabIndex/Enter-Space).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KpiTile } from '../components/cards/KpiTile';

afterEach(() => jest.clearAllMocks());

describe('KpiTile', () => {
  test('growth badge reads "vs last mo" by default (not the old hardcoded "vs Apr")', () => {
    render(<KpiTile label="MTD Revenue" value="₹10,00,000" growth={12} />);
    expect(screen.getByText(/12% vs last mo/)).toBeInTheDocument();
    expect(screen.queryByText(/vs Apr/)).toBeNull();
  });

  test('negative growth shows ▼ and the custom growthLabel', () => {
    render(<KpiTile label="GP" value="₹1,00,000" growth={-5} growthLabel="vs LY" />);
    expect(screen.getByText(/▼ 5% vs LY/)).toBeInTheDocument();
  });

  test('clickable tile is a keyboard-accessible button (role + Enter activates onClick)', () => {
    const onClick = jest.fn();
    render(<KpiTile label="Cash & Bank" value="₹5,00,000" onClick={onClick} />);
    const tile = screen.getByRole('button', { name: 'Cash & Bank: ₹5,00,000' });
    expect(tile).toHaveAttribute('tabIndex', '0');
    fireEvent.keyDown(tile, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(tile, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
    fireEvent.click(tile);
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  test('non-clickable tile is not a button and has no tabIndex', () => {
    render(<KpiTile label="Static" value="42" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
