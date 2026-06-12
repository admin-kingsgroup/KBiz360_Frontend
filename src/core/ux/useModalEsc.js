// One-liner to give any bespoke modal Esc-to-close via the shared modal stack.
//   Component modal (has onClose prop):     useModalEsc(onClose);
//   State-driven inline modal in a parent:  useModalEsc(() => setOpen(false), open);
// When `active` is false it registers nothing (so a closed modal doesn't capture Esc).
import { useEffect } from 'react';
import { pushModal } from './modalStore';

export function useModalEsc(onClose, active = true) {
  useEffect(() => {
    if (active && typeof onClose === 'function') return pushModal(onClose);
    return undefined;
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
}
