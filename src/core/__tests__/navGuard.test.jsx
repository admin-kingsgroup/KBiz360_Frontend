import React from 'react';
import { render } from '@testing-library/react';
import { setNavGuard, clearNavGuard, isGuardDirty, useNavGuard } from '../ux/navGuard';

describe('navGuard (module)', () => {
  afterEach(() => clearNavGuard());

  test('clean when nothing is registered', () => {
    clearNavGuard();
    expect(isGuardDirty()).toBe(false);
  });

  test('reflects the registered dirty-check live', () => {
    let dirty = false;
    setNavGuard(() => dirty);
    expect(isGuardDirty()).toBe(false);
    dirty = true;
    expect(isGuardDirty()).toBe(true);
  });

  test('unregister restores clean', () => {
    const off = setNavGuard(() => true);
    expect(isGuardDirty()).toBe(true);
    off();
    expect(isGuardDirty()).toBe(false);
  });

  test('a throwing guard is treated as not-dirty (an error must never block navigation)', () => {
    setNavGuard(() => { throw new Error('boom'); });
    expect(isGuardDirty()).toBe(false);
  });

  test('last registration wins — one editable form at a time', () => {
    setNavGuard(() => true);
    setNavGuard(() => false);
    expect(isGuardDirty()).toBe(false);
  });
});

describe('useNavGuard (hook)', () => {
  afterEach(() => clearNavGuard());

  function Form({ dirty }) { useNavGuard(() => dirty); return null; }

  test('registers while mounted (reading latest state) and clears on unmount', () => {
    const { rerender, unmount } = render(<Form dirty={false} />);
    expect(isGuardDirty()).toBe(false);
    rerender(<Form dirty />);        // dirty=true now
    expect(isGuardDirty()).toBe(true);
    unmount();
    expect(isGuardDirty()).toBe(false);
  });
});
