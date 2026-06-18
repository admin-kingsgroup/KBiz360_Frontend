/* Guards the trailing-slash normalisation in App.jsx (const route = ...).
   Live hosts served "/dashboard/" while dev served "/dashboard"; the trailing
   slash made every route===... / regex-$ check miss, so the page fell through
   to <Placeholder>. This mirrors that one-liner and locks in the behaviour. */

// Keep this identical to the expression in src/App.jsx.
const normalize = (pathname) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

describe('route trailing-slash normalisation', () => {
  test('the live bug: /dashboard/ resolves to /dashboard', () => {
    expect(normalize('/dashboard/')).toBe('/dashboard');
  });

  test('already-clean routes are unchanged', () => {
    expect(normalize('/dashboard')).toBe('/dashboard');
    expect(normalize('/sales/flight')).toBe('/sales/flight');
  });

  test('root path "/" is preserved (not emptied)', () => {
    expect(normalize('/')).toBe('/');
  });

  test('nested and multi-slash trailing forms collapse', () => {
    expect(normalize('/purchase/visa/')).toBe('/purchase/visa');
    expect(normalize('/dashboard//')).toBe('/dashboard');
  });

  test('normalised routes satisfy the App route checks', () => {
    // exact-match handler (App.jsx:338)
    expect(normalize('/dashboard/') === '/dashboard').toBe(true);
    // regex handler with $ anchor (App.jsx:351)
    expect(/^\/sales\/(flight|holiday|hotel|visa|car|insurance|misc)$/
      .test(normalize('/sales/hotel/'))).toBe(true);
  });
});
