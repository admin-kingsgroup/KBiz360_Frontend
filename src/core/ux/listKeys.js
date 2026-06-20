// ───────────────────────────────────────────────────────────────────────────
// listKeys — Up/Down arrow-key navigation for hand-rolled option lists.
//
// Many of the app's custom dropdowns / popovers / pick-lists render options as
// <div {...clickable(fn, { role:'option' })}>. clickable() already makes each
// option focusable + Enter/Space-activatable, but a user still has to Tab
// through them one by one — there's no ↑/↓ roving navigation like a native
// <select>. This helper closes that gap with a single onKeyDown handler spread
// onto the WRAPPER that contains both the trigger and the open list:
//
//   <div onKeyDown={listKeyNav({ onEscape: () => setOpen(false) })}>
//     <button …>Open</button>
//     {open && <div>{items.map((it) => (
//       <div {...clickable(() => pick(it), { role:'option' })}>{it.label}</div>
//     ))}</div>}
//   </div>
//
// ↑/↓ move focus between options (wrapping by default), Home/End jump to the
// first/last, and Esc (when onEscape is given) closes. Because it keys off real
// DOM focus + querySelectorAll, it works whether focus starts on a trigger
// button or a search input — ↓ from either lands on the first option.
// ───────────────────────────────────────────────────────────────────────────

// Only genuine, enabled options — never the trigger button or search input.
export const OPTION_SELECTOR =
  '[role="option"]:not([aria-disabled="true"]),[role="menuitem"]:not([aria-disabled="true"])';

const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

export function listKeyNav({ itemSelector = OPTION_SELECTOR, loop = true, onEscape } = {}) {
  return (e) => {
    if (e.key === 'Escape') {
      if (onEscape) { e.preventDefault(); onEscape(); }
      return;
    }
    if (!NAV_KEYS.has(e.key)) return;
    const items = Array.from(e.currentTarget.querySelectorAll(itemSelector));
    if (items.length === 0) return;
    e.preventDefault();
    const cur = items.indexOf(document.activeElement);
    let next;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'ArrowDown') next = cur + 1 >= items.length ? (loop ? 0 : items.length - 1) : cur + 1;
    else next = cur <= 0 ? (loop ? items.length - 1 : 0) : cur - 1; // ArrowUp (cur === -1 → last)
    const target = items[next];
    if (target && typeof target.focus === 'function') {
      try { target.focus(); } catch { /* ignore */ }
    }
  };
}

export default listKeyNav;
