// ───────────────────────────────────────────────────────────────────────────
// Global toast/snackbar. Fire from anywhere (no hook needed):
//   import { toast } from '../core/ux/toast';
//   toast('Voucher PV-0042 saved');             // success (default)
//   toast('Could not save — try again', 'error');
// Mount <ToastHost/> once near the app root.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';

let SEQ = 1;
export function toast(msg, kind = 'success', ttl = 3200) {
  try { window.dispatchEvent(new CustomEvent('kb:toast', { detail: { id: SEQ++, msg, kind, ttl } })); } catch { /* ignore */ }
}

const COLORS = {
  success: { bg: '#0d1326', bar: '#27d07a', icon: '✓' },
  error:   { bg: '#0d1326', bar: '#ff6b6b', icon: '✗' },
  info:    { bg: '#0d1326', bar: '#5aa0ff', icon: 'ℹ' },
};

export function ToastHost() {
  const [items, setItems] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail; if (!t) return;
      setItems((xs) => [...xs, t]);
      timers.current[t.id] = setTimeout(() => {
        setItems((xs) => xs.filter((x) => x.id !== t.id));
        delete timers.current[t.id];
      }, t.ttl || 3200);
    };
    window.addEventListener('kb:toast', onToast);
    return () => {
      window.removeEventListener('kb:toast', onToast);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  if (!items.length) return null;
  const dismiss = (id) => setItems((xs) => xs.filter((x) => x.id !== id));

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 9500, pointerEvents: 'none' }}>
      {items.map((t) => {
        const c = COLORS[t.kind] || COLORS.success;
        return (
          <div key={t.id} onClick={() => dismiss(t.id)} role="status"
            style={{ pointerEvents: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              background: c.bg, color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              boxShadow: '0 6px 24px rgba(13,19,38,.28)', borderLeft: `4px solid ${c.bar}`, maxWidth: 520 }}>
            <span style={{ color: c.bar, fontWeight: 800 }}>{c.icon}</span>
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
