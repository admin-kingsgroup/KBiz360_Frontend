// Standard modal shell: backdrop + panel, header (title · ✕ · Esc hint), body,
// optional footer actions. Closes on ✕, backdrop click, and Esc (via the modal
// stack, so only the topmost modal closes). Focus is moved into the dialog on
// open, trapped while open, and restored to the opener on close.
import React, { useEffect, useRef } from 'react';
import { pushModal } from './modalStore';
import { useFocusTrap } from './focus';
import { Kbd } from './widgets.jsx';

const DARK = '#0d1326', DIM = '#5a6691';

export function Modal({ title, sub, onClose, footer, wide, maxWidth, children }) {
  const panel = useRef(null);
  const titleId = React.useId();
  // A backdrop click should only close when BOTH the mousedown and mouseup land
  // on the backdrop itself — otherwise a text-selection drag that starts inside
  // the panel and releases on the backdrop would wrongly dismiss the dialog.
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    const pop = pushModal(onClose);   // Esc closes the topmost; see ux/hotkeys + App
    return () => pop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trap focus in the panel and restore it to the opener on unmount. We don't
  // let the trap auto-focus (it would land on the ✕ button); instead we focus
  // the first form field for a faster keyboard entry, falling back to the panel.
  useFocusTrap(panel, { autoFocus: false });
  useEffect(() => {
    const el = panel.current;
    const first = el && el.querySelector('input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const target = first || el;
    const id = target ? setTimeout(() => { try { target.focus(); } catch { /* ignore */ } }, 40) : null;
    return () => { if (id) clearTimeout(id); };
  }, []);

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby={titleId}
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) onClose(); downOnBackdrop.current = false; }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 14px', overflow: 'auto' }}>
      <div ref={panel}
        style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: maxWidth || (wide ? 980 : 620), boxShadow: '0 18px 60px rgba(13,19,38,.35)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #e7e9f2' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div id={titleId} style={{ fontSize: 14, fontWeight: 800, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {sub && <div style={{ fontSize: 10.5, color: DIM, marginTop: 1 }}>{sub}</div>}
          </div>
          <Kbd>Esc</Kbd>
          <button type="button" onClick={onClose} title="Close (Esc)" aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 20, lineHeight: 1, padding: '0 2px' }}>✕</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', borderTop: '1px solid #e7e9f2', background: '#fafbfe', borderRadius: '0 0 10px 10px' }}>{footer}</div>}
      </div>
    </div>
  );
}
