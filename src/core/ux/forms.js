// Tally-style in-form keyboard + focus helpers (opt-in per form).
//
//   const formProps = useFormKeys({ onSubmit, onCancel });
//   <div {...formProps}> …inputs… </div>
//
// Enter        → move to the next focusable field (Tally "accept & advance")
// Enter (last) → onSubmit()
// Ctrl/Cmd+Enter → onSubmit() from anywhere
// Esc          → onCancel()
// Textareas keep native Enter (new line); buttons/submit keep native behaviour.
import { useCallback, useEffect, useRef } from 'react';

// Enter-to-advance walks DATA fields only — buttons (Dr/Cr toggles, "Add line",
// row delete ×) are intentionally excluded so Enter never lands on an action
// control mid-entry; users Tab to reach buttons. Ctrl/Cmd+Enter submits.
const ADVANCE_SELECTOR = 'input,select,textarea,[tabindex]:not([tabindex="-1"])';
const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'SELECT');

export function useFormKeys({ onSubmit, onCancel } = {}) {
  const ref = useRef(null);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { if (onCancel) { e.preventDefault(); onCancel(); } return; }
    if (e.key !== 'Enter') return;
    if ((e.ctrlKey || e.metaKey) && onSubmit) { e.preventDefault(); onSubmit(); return; }
    const el = e.target;
    if (el && el.tagName === 'TEXTAREA') return;            // newline in textareas
    if (el && el.tagName === 'BUTTON') return;              // let buttons click
    if (el && el.hasAttribute && el.hasAttribute('list')) return; // datalist autocomplete: let native Enter pick
    if (!isField(el)) return;
    e.preventDefault();
    const scope = ref.current || document;
    const fields = Array.from(scope.querySelectorAll(ADVANCE_SELECTOR))
      .filter((n) => !n.disabled && n.offsetParent !== null && n.type !== 'hidden');
    const i = fields.indexOf(el);
    const next = fields[i + 1];
    if (next) next.focus();
    else if (onSubmit) onSubmit();
  }, [onSubmit, onCancel]);

  return { ref, onKeyDown };
}

// Focus the first real field inside a container on mount (so keyboard works
// immediately without a click). Returns a ref to attach to the container.
export function useAutoFocus(active = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const first = ref.current.querySelector('input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if (first && typeof first.focus === 'function') {
      // next tick so the element is laid out / not stolen by a transition
      const id = setTimeout(() => { try { first.focus(); } catch { /* ignore */ } }, 40);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [active]);
  return ref;
}
