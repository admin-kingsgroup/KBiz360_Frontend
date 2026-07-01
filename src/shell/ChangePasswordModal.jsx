/* ════════════════════════════════════════════════════════════════════
   SHELL/CHANGEPASSWORDMODAL.JSX — self-service "Change password".
   Verifies the current password server-side, then sets the new one. NOTE:
   this is the SHARED CRM credential (SSO), so it also changes the CRM login.
   ════════════════════════════════════════════════════════════════════ */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '../core/ux/toast';
// NOTE: core/api is imported LAZILY inside submit() — it reads import.meta.env, which
// breaks jest's transform of anything that statically pulls it (UserMenu is unit-tested).

const MIN = 8;

export function ChangePasswordModal({ open, onClose }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const reset = () => { setCur(''); setNw(''); setCf(''); setShow(false); };
  const done = () => { reset(); onClose(); };

  const submit = async () => {
    if (!cur) { toast('Enter your current password', 'error'); return; }
    if (nw.length < MIN) { toast(`New password must be at least ${MIN} characters`, 'error'); return; }
    if (nw !== cf) { toast('New passwords do not match', 'error'); return; }
    if (nw === cur) { toast('New password must be different from the current one', 'error'); return; }
    setBusy(true);
    try {
      const { apiPost } = await import('../core/api');
      await apiPost('/api/auth/change-password', { currentPassword: cur, newPassword: nw });
      toast('Password changed — use it next time you sign in.', 'success');
      done();
    } catch (e) {
      toast(e?.message || 'Could not change password', 'error');
    } finally { setBusy(false); }
  };

  const field = (label, val, set, ph) => (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6691', marginBottom: 5 }}>{label}</span>
      <input type={show ? 'text' : 'password'} value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
        autoComplete={label.startsWith('Current') ? 'current-password' : 'new-password'}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cdd1d8', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }} />
    </label>
  );

  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) done(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 20px 50px -12px rgba(0,0,0,0.35)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#0d1326' }}>Change password</h2>
        <p style={{ margin: '0 0 16px', fontSize: 11.5, color: '#5a6691', lineHeight: 1.5 }}>
          This is your shared login — it also updates the password you use for the CRM.
        </p>
        {field('Current password', cur, setCur, 'Enter current password')}
        {field('New password', nw, setNw, `At least ${MIN} characters`)}
        {field('Confirm new password', cf, setCf, 'Re-enter new password')}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#5a6691', margin: '2px 0 18px', cursor: 'pointer' }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={done} disabled={busy}
            style={{ padding: '10px 16px', background: '#eef0f4', color: '#0d1326', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy}
            style={{ padding: '10px 18px', background: busy ? '#5a6691' : '#0d1326', color: '#d4a437', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
