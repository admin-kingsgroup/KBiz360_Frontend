// ───────────────────────────────────────────────────────────────────────────
// Global toast/snackbar (KBiz360 Pro theme). Fire from anywhere (no hook):
//   import { toast, toastSuccess, toastError, toastWarning, toastInfo } from '../core/ux/toast';
//   toastSuccess('Voucher PV-0042 saved');
//   toastError('Could not save — check your connection and try again');
// Mount <ToastHost/> once near the app root.
//
// Guidance: success = short + specific; error = what failed + what to do;
// warning = blocked/missing requirement; info = background action started.
// Don't toast passive fetch successes. Duplicate (same text+kind) toasts are
// de-duped automatically so background retries don't stack noise.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';

let SEQ = 1;
export function toast(msg, kind = 'success', ttl) {
  const dur = ttl || (kind === 'error' ? 5000 : kind === 'warning' ? 4200 : 3200);
  try { window.dispatchEvent(new CustomEvent('kb:toast', { detail: { id: SEQ++, msg, kind, ttl: dur } })); } catch { /* ignore */ }
}
export const toastSuccess = (msg, ttl) => toast(msg, 'success', ttl);
export const toastError   = (msg, ttl) => toast(msg, 'error', ttl);
export const toastWarning = (msg, ttl) => toast(msg, 'warning', ttl);
export const toastInfo    = (msg, ttl) => toast(msg, 'info', ttl);

// Graphite surface + semantic accent bar — matches the premium theme tokens.
const KINDS = {
  success: { bar: '#16a34a', icon: '✓' },
  error:   { bar: '#dc2626', icon: '✕' },
  warning: { bar: '#d97706', icon: '!' },
  info:    { bar: '#2563eb', icon: 'ℹ' },
};

export function ToastHost() {
  const [items, setItems] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail; if (!t) return;
      setItems((xs) => {
        if (xs.some((x) => x.msg === t.msg && x.kind === t.kind)) return xs; // de-dupe noisy repeats
        return [...xs, t];
      });
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
    <div
      className="noprint"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 'max(18px, env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '0 12px', zIndex: 9500, pointerEvents: 'none',
      }}
    >
      {items.map((t) => {
        const c = KINDS[t.kind] || KINDS.success;
        return (
          <div
            key={t.id} onClick={() => dismiss(t.id)} role="status" aria-live="polite"
            className="animate-kb-rise"
            style={{
              pointerEvents: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#1a1c22', color: '#fff', padding: '11px 16px', borderRadius: 12,
              fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
              boxShadow: '0 16px 40px -12px rgba(16,18,22,0.45), 0 2px 8px -4px rgba(16,18,22,0.3)',
              borderLeft: `4px solid ${c.bar}`, width: 'min(520px, calc(100vw - 24px))',
              wordBreak: 'break-word', overflowWrap: 'anywhere',
            }}
          >
            <span style={{ color: c.bar, fontWeight: 800, flexShrink: 0, lineHeight: 1.4 }}>{c.icon}</span>
            <span style={{ minWidth: 0 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
