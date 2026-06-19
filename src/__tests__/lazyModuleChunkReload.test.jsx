/* Guards the stale-chunk recovery path added to lazyModule.

   The live bug: opening "Outstanding & On-Account" after an Amplify redeploy
   threw "Failed to fetch dynamically imported module:
   .../assets/outstanding-XNYP_KmG.js". The open tab held the OLD index.html, so
   it requested a chunk hash that no longer existed on the server. The old
   "Try again" button was a no-op because React.lazy caches the rejected promise.

   Fix: isChunkLoadError() classifies the failure, and importWithRetry() retries
   once then forces a single guarded reload so the browser pulls the fresh
   index.html + current hashes. These tests lock that behaviour in. */

import { isChunkLoadError, importWithRetry } from '../core/lazyModule';

describe('isChunkLoadError', () => {
  test('classifies the real Amplify failure message', () => {
    const err = new Error(
      'Failed to fetch dynamically imported module: ' +
        'https://main.d3c7s4j5mgvl0k.amplifyapp.com/assets/outstanding-XNYP_KmG.js'
    );
    expect(isChunkLoadError(err)).toBe(true);
  });

  test('classifies Safari + MIME-type variants', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error("'text/html' is not a valid JavaScript MIME type"))).toBe(true);
  });

  test('does NOT misclassify ordinary runtime errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(new TypeError('x is not a function'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('importWithRetry', () => {
  let reloadSpy;
  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    reloadSpy = jest.fn();
    // jsdom's location.reload isn't implemented; override it.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('passes through a module that loads first try', async () => {
    const mod = { OutstandingOnAccount: () => null };
    const loaded = await importWithRetry(() => Promise.resolve(mod));
    expect(loaded).toBe(mod);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test('recovers from a transient blip on the single retry (no reload)', async () => {
    const mod = { OutstandingOnAccount: () => null };
    let calls = 0;
    const loader = () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/x.js'))
        : Promise.resolve(mod);
    };
    const p = importWithRetry(loader);
    await jest.advanceTimersByTimeAsync(600); // elapse the 500ms retry pause
    await expect(p).resolves.toBe(mod);
    expect(calls).toBe(2);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test('forces ONE reload when the chunk is genuinely gone', async () => {
    const fail = () =>
      Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/gone.js'));
    // promise stays pending after reload is triggered — assert the side effect
    importWithRetry(fail);
    await jest.advanceTimersByTimeAsync(600);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(Number(window.sessionStorage.getItem('kbiz_chunk_reload_ts'))).toBeGreaterThan(0);
  });

  test('does NOT loop: a second failure within the throttle window surfaces the error', async () => {
    window.sessionStorage.setItem('kbiz_chunk_reload_ts', String(Date.now())); // just reloaded
    const fail = () =>
      Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/gone.js'));
    const assertion = expect(importWithRetry(fail)).rejects.toThrow(
      /Failed to fetch dynamically imported module/
    );
    await jest.advanceTimersByTimeAsync(600);
    await assertion;
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test('non-chunk errors are never reloaded — they surface for the ErrorBoundary', async () => {
    const fail = () => Promise.reject(new Error('boom: a real bug'));
    const assertion = expect(importWithRetry(fail)).rejects.toThrow(/boom: a real bug/);
    await jest.advanceTimersByTimeAsync(600);
    await assertion;
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
