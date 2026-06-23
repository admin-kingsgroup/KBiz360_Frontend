// ───────────────────────────────────────────────────────────────────────────
// clickable — make a non-button element keyboard-operable (WS5/WS6 helper).
//
// The app has ~150 interactive <div>/<tr>/<span onClick> drill-downs that aren't
// reachable by keyboard. Where converting to a real <button> would break table
// markup or layout (e.g. a clickable <tr>), spread these props instead:
//
//   <tr {...clickable(() => openLedger(id))}>…</tr>
//
// It adds role="button", tabIndex, and an Enter/Space key handler so the element
// behaves like a button for keyboard + screen-reader users. Pass { role:'option' }
// (etc.) to override the announced role.
// ───────────────────────────────────────────────────────────────────────────
export function clickable(onActivate, { role = 'button', disabled = false } = {}) {
  if (disabled) return { 'aria-disabled': true };
  return {
    role,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
  };
}

export default clickable;
