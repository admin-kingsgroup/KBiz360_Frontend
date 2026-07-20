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

  test('ANY registered guard being dirty marks the app dirty (stack semantics)', () => {
    setNavGuard(() => false);
    setNavGuard(() => true);
    expect(isGuardDirty()).toBe(true);
  });

  // The core of the stacking fix: guarded surfaces can nest (a voucher drill over a
  // dirty Party Master). Unregistering the TOP guard must NOT drop the underlying one —
  // a single-slot design nulled it and silently lost the underlying form's protection.
  test('unregistering a nested guard leaves the underlying one intact (stacking restore)', () => {
    const offA = setNavGuard(() => true);   // form A (e.g. party master): dirty
    const offB = setNavGuard(() => false);  // form B mounts on top: clean
    expect(isGuardDirty()).toBe(true);      // A still counts — stack, not slot
    offB();                                 // B unmounts (drill closed)
    expect(isGuardDirty()).toBe(true);      // A's protection survives
    offA();
    expect(isGuardDirty()).toBe(false);
  });

  test('a throwing guard does not mask a sibling dirty guard', () => {
    setNavGuard(() => { throw new Error('boom'); });
    setNavGuard(() => true);
    expect(isGuardDirty()).toBe(true);
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

  test('two mounted forms both count; unmounting the clean one keeps the dirty one armed', () => {
    const a = render(<Form dirty />);
    const b = render(<Form dirty={false} />);
    expect(isGuardDirty()).toBe(true);
    b.unmount();                     // close the second (clean) form
    expect(isGuardDirty()).toBe(true); // first (dirty) form still guarded
    a.unmount();
    expect(isGuardDirty()).toBe(false);
  });

  test('a dirty form arms a browser beforeunload prompt; a clean/unmounted one does not', () => {
    const fire = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    const { rerender, unmount } = render(<Form dirty />);
    expect(fire()).toBe(true);       // refresh/close on a dirty form → prompted
    rerender(<Form dirty={false} />);
    expect(fire()).toBe(false);      // clean form → no prompt
    rerender(<Form dirty />);
    unmount();
    expect(fire()).toBe(false);      // listener removed on unmount
  });
});
