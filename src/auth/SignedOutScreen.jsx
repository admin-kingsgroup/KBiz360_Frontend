/* ════════════════════════════════════════════════════════════════════
   SignedOutScreen — Tailwind reference implementation
   ════════════════════════════════════════════════════════════════════

   This file is the REFERENCE for how to write Tailwind-first
   components in KBiz360. Use this pattern for all new components.

   Migration playbook (from inline styles → Tailwind):
   1. Replace `style={{background:"#0d1326"}}`         → `className="bg-navy"`
   2. Replace `style={{color:"#d4a437"}}`              → `className="text-gold"`
   3. Replace `style={{padding:20,margin:0}}`          → `className="p-5 m-0"`
   4. Keep DYNAMIC styles inline (e.g., color from state):
        Bad:    className={`text-[${color}]`}          ← Tailwind can't see this
        Good:   style={{color}}                        ← keep dynamic in style={}
   5. For ROLE_COLOR-style lookups, use the role.* palette in tailwind.config.js
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { KBIZ_LOGO } from '../core/brand';

export function SignedOutScreen({ onSignIn }) {
  const [signing, setSigning] = useState(false);

  const handleSignIn = () => {
    setSigning(true);
    setTimeout(() => onSignIn(), 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-navy to-navy-light p-5">
      <div className="bg-white rounded-2xl px-8 py-10 max-w-md w-full
                      text-center shadow-brand-lg">

        {/* ─── KBiz360 brand lockup ─── */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src={KBIZ_LOGO}
            alt="KBiz360"
            className="w-[58px] h-[58px] rounded-xl block object-contain flex-shrink-0"
          />
          <div className="text-left leading-none">
            <div className="flex items-baseline gap-2">
              <p className="m-0 text-2xl font-extrabold text-navy tracking-tight">
                <span className="text-gold">KBiz</span>360
              </p>
              <p className="m-0 text-[11px] text-ink-muted font-semibold whitespace-nowrap">
                Smart Travel ERP
              </p>
            </div>
            <p className="mt-1 mb-0 text-[9px] kbiz-tagline whitespace-nowrap">
              THE BUSINESS ENGINE
            </p>
          </div>
        </div>

        {/* ─── Decorative gold divider (gradient — kept inline for custom gradient) ─── */}
        <div
          className="h-0.5 my-6"
          style={{ background: 'linear-gradient(90deg, transparent, #d4a437, transparent)' }}
        />

        {/* ─── Sign-out icon ─── */}
        <div className="w-20 h-20 rounded-full bg-gold-light/30 mx-auto mb-5
                        flex items-center justify-center">
          <LogOut size={36} className="text-gold" />
        </div>

        {/* ─── Heading & description ─── */}
        <h2 className="m-0 mb-2 text-xl font-bold text-navy">
          You're signed out
        </h2>
        <p className="m-0 mb-7 text-[13px] text-ink-muted leading-relaxed">
          Thanks for using KBiz360. Your session has ended securely.<br />
          Click below to sign back in.
        </p>

        {/* ─── Sign-in button ─── */}
        <button
          onClick={handleSignIn}
          disabled={signing}
          className="kbiz-btn-primary"
        >
          {signing ? 'Signing in...' : '↻  Sign Back In'}
        </button>

        {/* ─── Footer ─── */}
        <p className="mt-6 mb-0 text-[10.5px] text-ink-subtle">
          Travkings Tours &amp; Travels Pvt. Ltd.<br />
          Need help? Contact <b className="text-ink-muted">support@travkings.com</b>
        </p>
      </div>
    </div>
  );
}
