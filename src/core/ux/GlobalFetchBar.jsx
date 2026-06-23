import React, { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * Global top progress bar.
 *
 * Shows a thin indeterminate bar across the top of the viewport whenever ANY
 * React-Query request (query or mutation) is in flight — so a pending API always
 * has a visible loader, app-wide, without wiring each screen.
 *
 * Two guards keep it from being noisy:
 *   • a 140ms start delay → instant/cached responses never flash the bar;
 *   • a short tail before hiding → quick back-to-back fetches read as one smooth
 *     bar instead of strobing.
 */
export function GlobalFetchBar() {
  const busy = (useIsFetching() + useIsMutating()) > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(busy), busy ? 140 : 240);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
        pointerEvents: 'none', overflow: 'hidden',
        opacity: visible ? 1 : 0, transition: 'opacity 220ms ease',
      }}
    >
      {visible && <div className="kb-fetchbar" />}
    </div>
  );
}

export default GlobalFetchBar;
