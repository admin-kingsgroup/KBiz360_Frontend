// Lightweight modal stack (module-level, not React state) so a global Esc
// handler can synchronously close the topmost open modal and only fall through
// to "go back" when nothing is open. The standard <Modal> registers itself here.
const stack = [];

export function pushModal(close) {
  stack.push(close);
  return () => { const i = stack.indexOf(close); if (i >= 0) stack.splice(i, 1); };
}

// Close the topmost modal. Returns true if one was open (caller should stop).
export function closeTopModal() {
  const close = stack[stack.length - 1];
  if (close) { try { close(); } catch { /* ignore */ } return true; }
  return false;
}

export const modalCount = () => stack.length;
