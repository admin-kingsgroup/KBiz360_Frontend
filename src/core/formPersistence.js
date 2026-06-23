/* ════════════════════════════════════════════════════════════════════
   FORM PERSISTENCE  —  universal "draft autosave" to localStorage
   --------------------------------------------------------------------
   Goal: whatever you type into ANY data-entry field anywhere in the app
   survives a page refresh. No per-form wiring required.

   How it works (pure DOM, framework-agnostic):
     • SAVE   — a capture-phase 'input'/'change' listener records every
                native <input>/<textarea>/<select> value, debounced, into
                localStorage keyed by  route → fieldKey.
     • RESTORE— a MutationObserver waits for fields to mount (handles lazy
                routes, modals, dynamically added rows) and re-applies the
                saved value using React's *native* value setter so that
                controlled components pick the change up via onChange.
                Only EMPTY fields are restored, so server-prefilled edit
                forms are never clobbered.
     • CLEAR  — on any successful save (2xx response to a non-GET request,
                detected by patching XMLHttpRequest + fetch) or a native
                form submit, the current route's draft is wiped.

   Opt out of any field with  data-no-persist  (or a whole subtree).
   Sensitive types (password/file/hidden/buttons) are never stored.
   ════════════════════════════════════════════════════════════════════ */

const NS = '__kbizFormDrafts_v1';
const SAVE_DEBOUNCE_MS = 300;
const SKIP_TYPES = new Set([
  'password', 'file', 'hidden', 'submit', 'button', 'reset', 'image',
]);

/* ── store helpers (pure, exported for tests) ─────────────────────── */
export function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(NS)) || {};
  } catch {
    return {};
  }
}

export function persistStore(store) {
  try {
    localStorage.setItem(NS, JSON.stringify(store));
  } catch {
    /* quota / disabled — degrade silently */
  }
}

export function routeKey() {
  // pathname for router apps; falls back to '/' when there is no URL routing
  return (typeof location !== 'undefined' && location.pathname) || '/';
}

/* A stable-ish identifier for a field within its route. Prefers an
   explicit name/id; otherwise builds a positional key scoped to the
   nearest form/container so two blank fields don't collide. */
export function computeFieldKey(el) {
  if (el.name) return 'n:' + el.name;
  if (el.id) return 'i:' + el.id;
  const container =
    el.closest('form') ||
    el.closest('[data-form]') ||
    el.closest('[role="dialog"]') ||
    el.ownerDocument.body;
  const type = (el.type || '').toLowerCase();
  const peers = Array.from(
    container.querySelectorAll(el.tagName.toLowerCase()),
  ).filter((x) => (x.type || '').toLowerCase() === type);
  const idx = peers.indexOf(el);
  const label =
    el.getAttribute('placeholder') ||
    el.getAttribute('aria-label') ||
    el.getAttribute('data-field') ||
    '';
  return ['p', el.tagName, type, idx, label].join(':');
}

export function shouldPersist(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
  const type = (el.type || '').toLowerCase();
  if (SKIP_TYPES.has(type)) return false;
  if (el.autocomplete === 'off' && type === 'password') return false;
  if (el.closest('[data-no-persist]')) return false;
  return true;
}

/* Serialise a field's current value for storage. */
function readValue(el) {
  const type = (el.type || '').toLowerCase();
  if (type === 'checkbox' || type === 'radio') return !!el.checked;
  return el.value;
}

/* ── React-safe value injection ───────────────────────────────────── */
function setNativeValue(el, value) {
  const proto =
    el.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT'
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/* Apply a saved value, but only when it is safe (field still empty), so
   we never stomp on data the app prefilled for an edit/view screen. */
function restoreValue(el, saved) {
  const type = (el.type || '').toLowerCase();
  if (type === 'checkbox' || type === 'radio') {
    if (!!el.checked !== !!saved) el.click(); // fires React onChange
    return;
  }
  if (el.tagName === 'SELECT') {
    if (el.selectedIndex <= 0 && el.value !== saved) setNativeValue(el, saved);
    return;
  }
  if (el.value === '' && saved !== '' && saved != null) {
    setNativeValue(el, saved);
  }
}

/* ════════════════════════════════════════════════════════════════════
   Runtime wiring — only meaningful in a browser. Guarded so the module
   can be imported in tests without attaching global side effects twice.
   ════════════════════════════════════════════════════════════════════ */
export function initFormPersistence() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__KBIZ_FORM_PERSIST__) return;
  window.__KBIZ_FORM_PERSIST__ = true;

  let store = loadStore();
  let saveTimer = null;

  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistStore(store), SAVE_DEBOUNCE_MS);
  };

  const capture = (el) => {
    if (!shouldPersist(el)) return;
    const rk = routeKey();
    (store[rk] || (store[rk] = {}))[computeFieldKey(el)] = readValue(el);
    scheduleSave();
  };

  document.addEventListener(
    'input',
    (e) => capture(e.target),
    true,
  );
  document.addEventListener(
    'change',
    (e) => capture(e.target),
    true,
  );

  // Restore any saved field that is present (or appears later).
  const restoreEl = (el) => {
    if (!shouldPersist(el) || el.dataset.kbizRestored) return;
    const saved = store[routeKey()];
    if (!saved) return;
    const k = computeFieldKey(el);
    if (!(k in saved)) return;
    el.dataset.kbizRestored = '1';
    restoreValue(el, saved[k]);
  };

  const scanAndRestore = (root) => {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('input,textarea,select')) restoreEl(root);
    root.querySelectorAll('input,textarea,select').forEach(restoreEl);
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) scanAndRestore(node);
      });
    }
  });

  const start = () => {
    scanAndRestore(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /* ── clear-on-save ──────────────────────────────────────────────── */
  const clearRoute = (rk = routeKey()) => {
    if (store[rk]) {
      delete store[rk];
      persistStore(store);
    }
  };

  // Native form submit (covers plain HTML form posts).
  document.addEventListener(
    'submit',
    () => clearRoute(),
    true,
  );

  // Patch XHR (axios) — clear current route's draft on a 2xx non-GET.
  const XHRopen = XMLHttpRequest.prototype.open;
  const XHRsend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, ...rest) {
    this.__kbizMethod = (method || '').toUpperCase();
    return XHRopen.call(this, method, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__kbizMethod && this.__kbizMethod !== 'GET') {
      const rk = routeKey();
      this.addEventListener('load', () => {
        if (this.status >= 200 && this.status < 300) clearRoute(rk);
      });
    }
    return XHRsend.apply(this, args);
  };

  // Patch fetch — same rule for apps/components using fetch().
  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init = {}) {
      const method = (
        init.method ||
        (typeof input === 'object' && input && input.method) ||
        'GET'
      ).toUpperCase();
      const rk = routeKey();
      const p = origFetch(input, init);
      if (method !== 'GET') {
        p.then((res) => {
          if (res && res.ok) clearRoute(rk);
        }).catch(() => {});
      }
      return p;
    };
  }

  // Public escape hatch for manual clearing.
  window.__kbizClearDrafts = (rk) => {
    if (rk) clearRoute(rk);
    else {
      store = {};
      persistStore(store);
    }
  };
}

// Auto-initialise on import in a browser context.
initFormPersistence();
