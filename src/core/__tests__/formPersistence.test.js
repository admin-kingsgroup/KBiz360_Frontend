/**
 * formPersistence — universal draft autosave to localStorage.
 * Exercises the pure key/store helpers plus the live DOM save→restore→clear
 * flow (the module auto-inits on import in the jsdom environment).
 */
import {
  loadStore,
  persistStore,
  computeFieldKey,
  shouldPersist,
  routeKey,
} from '../formPersistence.js';

const NS = '__kbizFormDrafts_v1';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

function makeInput({ tag = 'input', type = 'text', name, id } = {}) {
  const el = document.createElement(tag);
  if (type && tag === 'input') el.type = type;
  if (name) el.name = name;
  if (id) el.id = id;
  document.body.appendChild(el);
  return el;
}

describe('field eligibility + keys', () => {
  test('persists text inputs, skips sensitive + opted-out fields', () => {
    expect(shouldPersist(makeInput({ name: 'amount' }))).toBe(true);
    expect(shouldPersist(makeInput({ type: 'password', name: 'pw' }))).toBe(false);
    expect(shouldPersist(makeInput({ type: 'file', name: 'doc' }))).toBe(false);
    expect(shouldPersist(makeInput({ type: 'button' }))).toBe(false);

    const wrap = document.createElement('div');
    wrap.setAttribute('data-no-persist', '');
    const inner = document.createElement('input');
    inner.name = 'secret';
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    expect(shouldPersist(inner)).toBe(false);
  });

  test('prefers name, then id, then a positional key', () => {
    expect(computeFieldKey(makeInput({ name: 'partyName' }))).toBe('n:partyName');
    expect(computeFieldKey(makeInput({ id: 'narration' }))).toBe('i:narration');
    const a = makeInput();
    const b = makeInput();
    expect(computeFieldKey(a)).not.toBe(computeFieldKey(b)); // positional, distinct
  });
});

describe('store round-trip', () => {
  test('persistStore + loadStore survive a (simulated) refresh', () => {
    persistStore({ '/voucher': { 'n:amount': '5000' } });
    expect(loadStore()).toEqual({ '/voucher': { 'n:amount': '5000' } });
    expect(JSON.parse(localStorage.getItem(NS))['/voucher']['n:amount']).toBe('5000');
  });
});

describe('live save → restore → clear', () => {
  test('typing is captured to localStorage (debounced)', async () => {
    const el = makeInput({ name: 'invoiceNo' });
    el.value = 'INV-42';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350)); // past SAVE_DEBOUNCE_MS
    const saved = loadStore()[routeKey()];
    expect(saved['n:invoiceNo']).toBe('INV-42');
  });

  // Seed the LIVE in-memory store the way the app does: by typing. (A real
  // page refresh reloads the module which re-reads localStorage; tests can't
  // reload the module, so we drive the same capture path instead.)
  async function seedByTyping(name, value) {
    const el = makeInput({ name });
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    el.remove(); // simulate leaving the page; draft stays in the store
    return el;
  }

  test('a freshly mounted empty field is restored from the saved draft', async () => {
    await seedByTyping('restoreA', 'INV-99');
    // Mount a fresh empty field with the same name — observer should fill it.
    const el = makeInput({ name: 'restoreA' });
    await new Promise((r) => setTimeout(r, 0)); // let observer microtask flush
    expect(el.value).toBe('INV-99');
  });

  test('restore never clobbers a prefilled (non-empty) field', async () => {
    await seedByTyping('restoreB', 'DRAFT');
    const el = makeInput({ name: 'restoreB' });
    el.value = 'SERVER-PREFILL'; // simulate edit-mode prefill before observer runs
    await new Promise((r) => setTimeout(r, 0));
    expect(el.value).toBe('SERVER-PREFILL');
  });

  test('a successful non-GET XHR clears the current route draft', async () => {
    const rk = routeKey();
    await seedByTyping('clearC', 'INV-7');
    expect(loadStore()[rk]).toBeDefined();

    // Drive the patched XHR through a load event with a 2xx status.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/vouchers');
    // jsdom XHR won't really hit the network; emulate completion.
    Object.defineProperty(xhr, 'status', { value: 201, configurable: true });
    xhr.send();
    xhr.dispatchEvent(new Event('load'));

    expect(loadStore()[rk]).toBeUndefined();
  });
});
