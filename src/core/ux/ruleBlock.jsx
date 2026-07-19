import React, { useEffect, useState } from 'react';
import { apiGet } from '../api';

// ─── RuleBlockHost — "which rule blocked me, and why" ────────────────────────
// When a law blocks a request, the server throws ruleError(ruleId, …) and the api
// interceptor fires 'kb:rule-block' with { msg, ruleId }. This host shows the rule
// NUMBER + the message, and a "Why?" that pulls the rule's plain-English description +
// source line from the registry (/api/rules/:ruleId). Mount once near the app root
// (next to <ToastHost/>). No rule id → nothing shows (plain toasts still handle those).

export function RuleBlockHost() {
  const [block, setBlock] = useState(null);   // { msg, ruleId }
  const [detail, setDetail] = useState(null); // fetched rule
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const on = (e) => { if (e.detail && e.detail.ruleId) { setBlock(e.detail); setDetail(null); } };
    window.addEventListener('kb:rule-block', on);
    return () => window.removeEventListener('kb:rule-block', on);
  }, []);

  // Auto-dismiss after a while so it never lingers (the user can also close it).
  useEffect(() => {
    if (!block) return undefined;
    const t = setTimeout(() => { setBlock(null); setDetail(null); }, 15000);
    return () => clearTimeout(t);
  }, [block]);

  if (!block) return null;

  const why = async () => {
    if (detail) { setDetail(null); return; }
    setLoading(true);
    try {
      const r = await apiGet(`/api/rules/${encodeURIComponent(block.ruleId)}`);
      setDetail((r && r.data) || { ruleId: block.ruleId, title: block.ruleId, description: 'No further detail on file.' });
    } catch {
      setDetail({ ruleId: block.ruleId, title: block.ruleId, description: 'Rule details are unavailable right now.' });
    } finally { setLoading(false); }
  };

  const close = () => { setBlock(null); setDetail(null); };

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9000, maxWidth: 400, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#2a1113', border: '1px solid #7f3034', borderRadius: 11, boxShadow: '0 14px 40px rgba(0,0,0,0.4)', color: '#ffe7e7', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderBottom: detail ? '1px solid #7f3034' : 'none' }}>
          <span style={{ fontWeight: 800, fontSize: 12.5 }}>⛔ Blocked</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 800, background: '#7f3034', color: '#ffdede', padding: '1px 7px', borderRadius: 5 }}>Rule {block.ruleId}</span>
          <button onClick={close} aria-label="Dismiss" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#f4b4b4', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '9px 13px' }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#ffdede' }}>{block.msg}</div>
          <button onClick={why} style={{ marginTop: 8, background: 'transparent', border: '1px solid #a35', color: '#ffc9c9', fontWeight: 700, fontSize: 11.5, padding: '4px 11px', borderRadius: 7, cursor: 'pointer' }}>
            {loading ? 'Loading…' : detail ? 'Hide details' : 'Why? ▾'}
          </button>
          {detail && (
            <div style={{ marginTop: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid #7f3034', borderRadius: 8, padding: '9px 11px' }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#fff' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{detail.ruleId || block.ruleId}</span> · {detail.title || 'Rule'}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 5, color: '#ffe7e7' }}>{detail.description || ''}</div>
              {detail.sourceRef && (
                <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 7, fontFamily: 'ui-monospace, monospace' }}>Enforced at {detail.sourceRef}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
