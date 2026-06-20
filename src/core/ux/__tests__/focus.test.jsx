import React, { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { getFocusable, useFocusTrap, useReturnFocus, rovingNextIndex } from '../focus';

describe('getFocusable', () => {
  it('returns tabbable elements in document order, skipping disabled/hidden/tabindex=-1', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <button id="b1">one</button>
      <button id="b2" disabled>two</button>
      <a id="a1" href="#">link</a>
      <input id="i1" />
      <input id="i2" type="hidden" />
      <div id="d1" tabindex="0">focusable div</div>
      <div id="d2" tabindex="-1">programmatic only</div>
      <button id="b3" aria-hidden="true">hidden</button>`;
    document.body.appendChild(div);
    const ids = getFocusable(div).map((el) => el.id);
    expect(ids).toEqual(['b1', 'a1', 'i1', 'd1']);
    document.body.removeChild(div);
  });

  it('is safe on null', () => {
    expect(getFocusable(null)).toEqual([]);
  });
});

function TrapHarness({ active = true }) {
  const ref = useRef(null);
  useFocusTrap(ref, { active });
  return (
    <div>
      <button id="outside">outside</button>
      <div ref={ref} data-testid="panel">
        <button id="first">first</button>
        <button id="mid">mid</button>
        <button id="last">last</button>
      </div>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('auto-focuses the first focusable on activate', () => {
    render(<TrapHarness />);
    expect(document.activeElement.id).toBe('first');
  });

  it('wraps Tab from last → first', () => {
    render(<TrapHarness />);
    const last = document.getElementById('last');
    last.focus();
    fireEvent.keyDown(screen.getByTestId('panel'), { key: 'Tab' });
    expect(document.activeElement.id).toBe('first');
  });

  it('wraps Shift+Tab from first → last', () => {
    render(<TrapHarness />);
    const first = document.getElementById('first');
    first.focus();
    fireEvent.keyDown(screen.getByTestId('panel'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement.id).toBe('last');
  });

  it('restores focus to the opener on unmount', () => {
    const { unmount } = render(<TrapHarness />);
    // simulate that something outside had focus before the trap mounted:
    // re-render path — here we just assert focus returns to <body> opener.
    const opener = document.getElementById('outside');
    opener.focus();
    // Re-mount a trap so the captured "previouslyFocused" is the opener.
    const { unmount: unmount2 } = render(<TrapHarness />);
    unmount2();
    expect(document.activeElement.id).toBe('outside');
    unmount();
  });
});

function ReturnFocusHarness({ active }) {
  useReturnFocus(active);
  return <button id="rf-inside">inside</button>;
}

describe('useReturnFocus', () => {
  it('restores focus to the previously focused element on deactivate', () => {
    render(<button id="rf-opener">opener</button>);
    document.getElementById('rf-opener').focus();
    const { rerender } = render(<ReturnFocusHarness active />);
    document.getElementById('rf-inside').focus();
    rerender(<ReturnFocusHarness active={false} />);
    expect(document.activeElement.id).toBe('rf-opener');
  });
});

describe('rovingNextIndex', () => {
  it('moves down/up with wrap (vertical)', () => {
    expect(rovingNextIndex('ArrowDown', 0, 3)).toBe(1);
    expect(rovingNextIndex('ArrowDown', 2, 3)).toBe(0); // wrap
    expect(rovingNextIndex('ArrowUp', 0, 3)).toBe(2);   // wrap
  });
  it('honors Home/End', () => {
    expect(rovingNextIndex('Home', 2, 3)).toBe(0);
    expect(rovingNextIndex('End', 0, 3)).toBe(2);
  });
  it('uses left/right for horizontal orientation', () => {
    expect(rovingNextIndex('ArrowRight', 0, 3, { orientation: 'horizontal' })).toBe(1);
    expect(rovingNextIndex('ArrowDown', 0, 3, { orientation: 'horizontal' })).toBeNull();
  });
  it('returns null for non-navigation keys and empty lists', () => {
    expect(rovingNextIndex('a', 0, 3)).toBeNull();
    expect(rovingNextIndex('ArrowDown', 0, 0)).toBeNull();
  });
  it('clamps without wrap when loop=false', () => {
    expect(rovingNextIndex('ArrowDown', 2, 3, { loop: false })).toBe(2);
    expect(rovingNextIndex('ArrowUp', 0, 3, { loop: false })).toBe(0);
  });
});
