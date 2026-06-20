import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { clickable } from '../clickable';

describe('clickable', () => {
  it('adds button semantics and a tab stop', () => {
    render(<div data-testid="row" {...clickable(() => {})}>row</div>);
    const row = screen.getByTestId('row');
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('tabindex', '0');
  });

  it('activates on click, Enter, and Space', () => {
    const fn = jest.fn();
    render(<div data-testid="row" {...clickable(fn)}>row</div>);
    const row = screen.getByTestId('row');
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not activate on other keys', () => {
    const fn = jest.fn();
    render(<div data-testid="row" {...clickable(fn)}>row</div>);
    fireEvent.keyDown(screen.getByTestId('row'), { key: 'a' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('supports a custom role and a disabled state', () => {
    render(<div data-testid="opt" {...clickable(() => {}, { role: 'option' })}>opt</div>);
    expect(screen.getByTestId('opt')).toHaveAttribute('role', 'option');
    const fn = jest.fn();
    render(<div data-testid="dis" {...clickable(fn, { disabled: true })}>dis</div>);
    fireEvent.click(screen.getByTestId('dis'));
    expect(fn).not.toHaveBeenCalled();
    expect(screen.getByTestId('dis')).toHaveAttribute('aria-disabled', 'true');
  });
});
