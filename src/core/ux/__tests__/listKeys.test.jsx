import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { listKeyNav, OPTION_SELECTOR } from '../listKeys';
import { clickable } from '../clickable';

// A realistic popover: a trigger button + a list of clickable role="option"
// rows, exactly the shape used by ContextBar / PurchaseLinkField / alerts.
function Popover({ onPick, onEscape }) {
  const [open, setOpen] = useState(false);
  return (
    <div onKeyDown={listKeyNav({ onEscape: () => { setOpen(false); onEscape && onEscape(); } })}>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      {open && (
        <div>
          {['Alpha', 'Beta', 'Gamma'].map((l) => (
            <div key={l} {...clickable(() => onPick(l), { role: 'option' })}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const opts = () => screen.getAllByRole('option');

describe('listKeyNav', () => {
  it('ArrowDown from the trigger moves focus onto the first option', () => {
    render(<Popover onPick={() => {}} />);
    const trigger = screen.getByText('Open');
    fireEvent.click(trigger);
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(opts()[0]).toHaveFocus();
  });

  it('ArrowDown/ArrowUp walk through the options', () => {
    render(<Popover onPick={() => {}} />);
    fireEvent.click(screen.getByText('Open'));
    const [a, b] = opts();
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowDown' });
    expect(b).toHaveFocus();
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    expect(a).toHaveFocus();
  });

  it('wraps at the ends by default (down from last → first, up from first → last)', () => {
    render(<Popover onPick={() => {}} />);
    fireEvent.click(screen.getByText('Open'));
    const items = opts();
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(last).toHaveFocus();
  });

  it('Home/End jump to the first/last option', () => {
    render(<Popover onPick={() => {}} />);
    fireEvent.click(screen.getByText('Open'));
    const items = opts();
    items[1].focus();
    fireEvent.keyDown(items[1], { key: 'End' });
    expect(items[items.length - 1]).toHaveFocus();
    fireEvent.keyDown(items[items.length - 1], { key: 'Home' });
    expect(items[0]).toHaveFocus();
  });

  it('Enter on a focused option still selects it (via clickable)', () => {
    const picked = [];
    render(<Popover onPick={(l) => picked.push(l)} />);
    fireEvent.click(screen.getByText('Open'));
    const b = opts()[1];
    b.focus();
    fireEvent.keyDown(b, { key: 'Enter' });
    expect(picked).toEqual(['Beta']);
  });

  it('Escape invokes onEscape (closes the list)', () => {
    const onEscape = jest.fn();
    render(<Popover onPick={() => {}} onEscape={onEscape} />);
    fireEvent.click(screen.getByText('Open'));
    expect(opts()).toHaveLength(3);
    fireEvent.keyDown(opts()[0], { key: 'Escape' });
    expect(onEscape).toHaveBeenCalled();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('does nothing when there are no options (handler is a no-op)', () => {
    render(<Popover onPick={() => {}} />);
    const trigger = screen.getByText('Open');
    trigger.focus();
    // list closed → no options; ArrowDown must not throw and focus stays put
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger).toHaveFocus();
  });

  it('OPTION_SELECTOR ignores disabled options', () => {
    expect(OPTION_SELECTOR).toContain('aria-disabled');
  });
});
