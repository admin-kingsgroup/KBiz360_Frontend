import { setSupportPrefill, takeSupportPrefill } from '../supportPrefill';

describe('supportPrefill', () => {
  beforeEach(() => { takeSupportPrefill(); }); // drain any leftover between tests

  test('set → take returns the value once, then null (consumed exactly once)', () => {
    setSupportPrefill({ title: 't', description: 'd', route: '/x' });
    expect(takeSupportPrefill()).toEqual({ title: 't', description: 'd', route: '/x' });
    expect(takeSupportPrefill()).toBeNull();
  });

  test('set notifies an already-mounted Support page via kbiz:support-prefill', () => {
    const fn = jest.fn();
    window.addEventListener('kbiz:support-prefill', fn);
    setSupportPrefill({ title: 't' });
    expect(fn).toHaveBeenCalledTimes(1);
    window.removeEventListener('kbiz:support-prefill', fn);
  });

  test('logout clears a stashed prefill — no cross-user leak on a shared device', () => {
    setSupportPrefill({ title: 'A private report', description: 'secret', route: '/reports/bs' });
    window.dispatchEvent(new CustomEvent('kbiz:logout'));
    expect(takeSupportPrefill()).toBeNull();
  });
});
