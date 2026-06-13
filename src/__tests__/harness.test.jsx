import React from 'react';
import { render, screen } from '@testing-library/react';

// Mirrors the Indian-currency formatter used across the live reports.
const inr = (n) => (n < 0 ? '-' : '') + '₹' + Math.abs(Math.round(Number(n) || 0)).toLocaleString('en-IN');
function Statement({ total }) { return <div role="row">Total {inr(total)}</div>; }

describe('frontend jest harness', () => {
  test('renders a component via jsdom + RTL', () => {
    render(<Statement total={685929} />);
    expect(screen.getByRole('row')).toHaveTextContent('Total ₹6,85,929');
  });
  test.concurrent('inr formats positive (Indian grouping)', async () => { expect(inr(1234567)).toMatch(/12.34.567/); });
  test.concurrent('inr formats zero', async () => { expect(inr(0)).toBe('₹0'); });
  test.concurrent('inr formats negative', async () => { expect(inr(-4361603)).toMatch(/^-₹/); });
});
