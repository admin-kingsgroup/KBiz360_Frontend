// Modal stack — Esc-close core (LIFO topmost-first). Pure module, no DOM.
const { pushModal, closeTopModal, modalCount } = require('../modalStore');

describe('modalStore', () => {
  test('LIFO: closeTopModal closes the most-recently pushed', () => {
    const fired = [];
    const u1 = pushModal(() => fired.push('m1'));
    const u2 = pushModal(() => fired.push('m2'));
    expect(modalCount()).toBe(2);
    expect(closeTopModal()).toBe(true);
    expect(fired).toEqual(['m2']);   // topmost first
    u2();
    expect(closeTopModal()).toBe(true);
    expect(fired).toEqual(['m2', 'm1']);
    u1();
    expect(modalCount()).toBe(0);
    expect(closeTopModal()).toBe(false); // empty stack
  });

  test('unregister removes the handler without firing it', () => {
    const fired = [];
    const u = pushModal(() => fired.push('x'));
    u();
    expect(modalCount()).toBe(0);
    expect(fired).toEqual([]);
  });
});
