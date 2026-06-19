/* Guards the root-route restore logic in App.jsx.

   The live bug: hitting the app at the bare root URL "/" rendered the wrench
   <Placeholder> (titled "/") on every load. Cause: the route-persist effect
   runs BEFORE the restore effect on first mount, so it wrote "/" into
   kb360-route, clobbering the real last route; the restore then read "/" back,
   saw `saved === "/"`, and skipped the redirect.

   Fix: the persist effect skips route === "/". These tests mirror both
   one-liners from App.jsx and lock in the corrected behaviour. */

// Keep these identical to the expressions in src/App.jsx.
const persist = (store, route) => {
  if (route === "/") return;            // App.jsx persist effect guard
  store["kb360-route"] = route;
};
const resolveSaved = (store, hasToken) =>
  (hasToken ? store["kb360-route"] || "/dashboard" : "/dashboard");
const shouldRedirect = (pathname, saved) =>
  (pathname === "/" || pathname === "") && !!saved && saved !== "/";

describe('root-route restore', () => {
  test('the live bug: landing on "/" no longer clobbers the saved route', () => {
    const store = { "kb360-route": "/sales/flight" };
    persist(store, "/");                       // mount at root
    expect(store["kb360-route"]).toBe("/sales/flight"); // preserved, not "/"
    const saved = resolveSaved(store, true);
    expect(shouldRedirect("/", saved)).toBe(true);       // redirect fires
    expect(saved).toBe("/sales/flight");
  });

  test('fresh session (no saved route) falls back to /dashboard', () => {
    const store = {};
    persist(store, "/");
    const saved = resolveSaved(store, true);
    expect(saved).toBe("/dashboard");
    expect(shouldRedirect("/", saved)).toBe(true);
  });

  test('real routes are still persisted', () => {
    const store = {};
    persist(store, "/dashboard");
    expect(store["kb360-route"]).toBe("/dashboard");
    persist(store, "/purchase/visa");
    expect(store["kb360-route"]).toBe("/purchase/visa");
  });

  test('logged-out users default to /dashboard regardless of saved value', () => {
    const store = { "kb360-route": "/sales/flight" };
    expect(resolveSaved(store, false)).toBe("/dashboard");
  });
});
