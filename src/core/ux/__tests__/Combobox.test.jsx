import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Combobox } from '../Combobox';

const OPTIONS = [
  { value: '1', label: 'Cash in Hand' },
  { value: '2', label: 'Bank — HDFC' },
  { value: '3', label: 'Bank — ICICI' },
];

function Harness({ initial = '' }) {
  const [value, setValue] = useState(initial);
  return <Combobox value={value} options={OPTIONS} onChange={setValue} ariaLabel="Ledger" />;
}

const input = () => screen.getByRole('combobox');

describe('Combobox', () => {
  it('renders the selected label and combobox ARIA wiring', () => {
    render(<Harness initial="2" />);
    expect(input()).toHaveValue('Bank — HDFC');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('opens and filters by typed query', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'icici' } });
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent('Bank — ICICI');
  });

  it('navigates with arrows and selects with Enter', () => {
    render(<Harness />);
    fireEvent.click(input());                            // open, active 0
    fireEvent.keyDown(input(), { key: 'ArrowDown' });    // active 1 (HDFC)
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(input()).toHaveValue('Bank — HDFC');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('sets aria-activedescendant to the active option', () => {
    render(<Harness />);
    fireEvent.click(input());
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const desc = input().getAttribute('aria-activedescendant');
    expect(desc).toBeTruthy();
    expect(document.getElementById(desc)).toHaveAttribute('role', 'option');
  });

  it('Escape closes and reverts to the selected value', () => {
    render(<Harness initial="1" />);
    fireEvent.change(input(), { target: { value: 'bank' } });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('Cash in Hand');
  });

  it('selects on option mousedown', () => {
    render(<Harness />);
    fireEvent.click(input());
    fireEvent.mouseDown(screen.getByText('Bank — ICICI'));
    expect(input()).toHaveValue('Bank — ICICI');
  });

  it('opens with ArrowDown from a closed box', () => {
    render(<Harness />);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows a no-matches message', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'zzz' } });
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});
