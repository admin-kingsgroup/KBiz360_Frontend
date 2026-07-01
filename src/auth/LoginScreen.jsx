/* ════════════════════════════════════════════════════════════════════
   AUTH/LOGINSCREEN.JSX — real email/password login (KBiz360 Books).
   Authenticates against the backend (POST /api/auth/login); only the
   whitelisted Books users may sign in. On success the JWT is stored under
   'kb360-token' and the user (role + branches) is handed to the app.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Lock, Plane, Users } from 'lucide-react';
import { KBIZ_LOGO } from '../core/brand';
import { useMobile } from '../core/hooks';

const API_BASE = import.meta.env.VITE_KBIZ_API_BASE || 'http://localhost:9090';

export function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const mob = useMobile();

  const handleSubmit = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setSigning(true); setError('');
    // Abort after 15s so a hung/unreachable backend never spins forever.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: ctrl.signal,
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error((json && json.message) || `Sign in failed (${resp.status})`);
      const data = json && 'data' in json ? json.data : json;
      if (!data?.user) throw new Error('Unexpected response from server.');
      // Role + branches come straight from the DB user record (returned by the API).
      const mergedUser = data.user;

      // Persist token + user so a page refresh keeps the session (see App.jsx restore).
      try {
        if (data.token) localStorage.setItem('kb360-token', data.token);
        localStorage.setItem('kb360-user', JSON.stringify(mergedUser));
      } catch { /* ignore */ }
      onSignIn(mergedUser); // unmounts this screen → main app
    } catch (e) {
      setError(e.name === 'AbortError'
        ? `Could not reach the server (${API_BASE}). Check your connection / API URL and try again.`
        : (e.message || 'Sign in failed.'));
      setSigning(false);
    } finally {
      clearTimeout(timer);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: mob ? 'column' : 'row', background: '#0d1326', overflow: mob ? 'auto' : 'hidden' }}>

      {/* ═══════ LEFT — Travkings brand ═══════ */}
      <div style={{ flex: mob ? 'none' : '0 0 52%', position: 'relative', background: 'linear-gradient(135deg,#0d1326 0%,#1a2340 60%,#2a1810 100%)', padding: mob ? '36px 24px 24px' : '50px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: mob ? 'auto' : '100vh', color: '#fff', overflow: 'hidden' }}>
        {!mob && <img src={KBIZ_LOGO} alt="" aria-hidden="true" style={{ position: 'absolute', right: -120, bottom: -120, width: 520, height: 520, opacity: 0.06, pointerEvents: 'none', borderRadius: 60 }} />}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', background: 'linear-gradient(180deg,#d4a437 0%,#9a6810 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: 'rgba(212,164,55,0.15)', borderRadius: 5, border: '1px solid rgba(212,164,55,0.4)', marginBottom: 18 }}>
            <Plane size={12} style={{ color: '#d4a437' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: '#d4a437' }}>IATA ACCREDITED · EST. 2008</span>
          </div>
          <h1 style={{ margin: 0, fontSize: mob ? 34 : 48, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1 }}>
            <span style={{ color: '#d4a437' }}>TRAV</span>KINGS
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#A32D2D', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>Tours &amp; Travels Pvt. Ltd.</p>
          <div style={{ height: 2, width: 60, background: '#d4a437', margin: '18px 0' }} />
          <p style={{ margin: 0, fontSize: mob ? 14 : 17, color: '#c8cfe0', lineHeight: 1.5, maxWidth: 480 }}>
            Crafting extraordinary journeys across <b style={{ color: '#fff' }}>India, Kenya, Tanzania &amp; DR Congo</b> for over 18 years.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, margin: mob ? '24px 0' : '32px 0' }}>
          <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: '#8b94b3', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Our Branches</p>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
            {[
              { flag: '🇮🇳', code: 'BOMMB', city: 'Mumbai' }, { flag: '🇮🇳', code: 'BOM', city: 'Mumbai' }, { flag: '🇮🇳', code: 'AMD', city: 'Ahmedabad' },
            ].map((b) => (
              <div key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{b.flag}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff' }}>{b.code}</p>
                  <p style={{ margin: 0, fontSize: 9.5, color: '#8b94b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(212,164,55,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={KBIZ_LOGO} alt="KBiz360" style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 8.5, color: '#8b94b3', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Powered by</p>
            <p style={{ margin: '1px 0 0', fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              <span style={{ color: '#d4a437' }}>KBiz</span>360 <span style={{ fontSize: 10, color: '#8b94b3', fontWeight: 600, marginLeft: 4 }}>Smart Travel ERP</span>
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 8, color: '#d4a437', fontWeight: 700, letterSpacing: '1.5px' }}>THE BUSINESS ENGINE</p>
          </div>
        </div>
      </div>

      {/* ═══════ RIGHT — login form ═══════ */}
      <div style={{ flex: mob ? 'none' : '1', background: '#f7f8fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? '30px 20px 40px' : '40px 30px', minHeight: mob ? 'auto' : '100vh' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 22 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#5a6691', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Welcome back</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: '#0d1326', letterSpacing: '-0.02em' }}>Sign in to KBiz360 Books</h2>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#5a6691', lineHeight: 1.5 }}>Use your Travkings account to access vouchers, books, and reports.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0d1326', marginBottom: 5 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Users size={14} style={{ position: 'absolute', left: 12, top: 14, color: '#8b94b3' }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@travkings.com" autoComplete="username"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                style={{ width: '100%', padding: '12px 14px 12px 36px', border: '1px solid #cdd1d8', borderRadius: 7, fontSize: 13, background: '#fff', color: '#0d1326', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#d4a437')} onBlur={(e) => (e.target.style.borderColor = '#d8dbe6')} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0d1326', marginBottom: 5 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: 14, color: '#8b94b3' }} />
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                style={{ width: '100%', padding: '12px 40px 12px 36px', border: '1px solid #cdd1d8', borderRadius: 7, fontSize: 13, background: '#fff', color: '#0d1326', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#d4a437')} onBlur={(e) => (e.target.style.borderColor = '#d8dbe6')} />
              <button onClick={() => setShowPwd((s) => !s)} style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', color: '#5a6691', fontSize: 11, fontWeight: 600 }}>{showPwd ? 'Hide' : 'Show'}</button>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 7, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 12, fontWeight: 600 }}>⚠ {error}</div>
          )}

          <button onClick={handleSubmit} disabled={signing}
            style={{ width: '100%', padding: '14px 16px', background: signing ? '#5a6691' : '#0d1326', color: '#d4a437', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: signing ? 'wait' : 'pointer', letterSpacing: '0.5px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', marginBottom: 16 }}>
            {signing ? 'Signing in…' : 'Sign In'} →
          </button>

          <div style={{ marginTop: 8, paddingTop: 18, borderTop: '1px solid #cdd1d8', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 10, color: '#8b94b3', lineHeight: 1.6 }}>
              © 2026 Travkings Tours &amp; Travels Pvt. Ltd. · All rights reserved.<br />
              Need access? Contact <b style={{ color: '#5a6691' }}>afshin.dhanani@kingsgroupco.com</b>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
