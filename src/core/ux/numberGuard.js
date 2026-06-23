// ───────────────────────────────────────────────────────────────────────────
// Global number-input wheel guard (WS3 — accounting data-integrity fix).
//
// A focused <input type="number"> changes its value when the mouse wheel scrolls
// over it. In an accounting app that silently corrupts amounts (a user scrolls
// the page and a posted figure quietly changes). This installs ONE capture-phase
// wheel listener that blurs the focused number input the instant a wheel event
// reaches it: the value can't change (it's no longer focused) and the page still
// scrolls normally. One install protects every amount field app-wide — no need to
// touch the hundreds of existing <input type="number"> sites.
//
// Call installNumberWheelGuard() once at startup (see main.jsx). Idempotent.
// ───────────────────────────────────────────────────────────────────────────
let installed = false;

export function installNumberWheelGuard() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('wheel', (e) => {
    const el = e.target;
    if (
      el &&
      el.tagName === 'INPUT' &&
      el.type === 'number' &&
      el === document.activeElement &&
      !el.readOnly &&
      !el.disabled
    ) {
      // Blur before the browser applies its default value-step on wheel.
      el.blur();
    }
  }, { passive: true, capture: true });
}

export default installNumberWheelGuard;
