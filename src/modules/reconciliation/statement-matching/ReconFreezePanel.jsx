/* ════════════════════════════════════════════════════════════════════
   RECONCILIATION FREEZE PANEL  (the "Freeze with a Tab" on the matching screens)
   Freezes ONE ledger for a month straight from the Bank / Client / Supplier
   matcher. Freeze is REFUSED by the backend unless every entry is reconciled;
   once frozen, the ledger's entries can no longer be revoked/edited until it is
   un-frozen (soft) or a Director/Owner re-opens a certified one (hard).
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { Snowflake, Lock, CheckCircle2, PenLine } from 'lucide-react';
import { C, card, money, aBtn } from '../../accountantWorkspace/shared';
import { getLedgerFreeze, freezeLedger, unfreezeLedger, signCertificate } from '../api';

const pill = (bg, color) => ({ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, background: bg, color, whiteSpace: 'nowrap' });
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

// The "touch tab" — a two-segment toggle (Un-Frozen ⇄ Frozen) that reads as one flip.
// Un-Frozen is active while open; Frozen is active while frozen. The Frozen segment is
// DISABLED (and reasons out) until every entry is reconciled — clicking it freezes;
// clicking Un-Frozen while frozen releases the soft lock. Certified locks the whole tab.
function FreezeTab({ frozen, canFreeze, busy, onFreeze, onUnfreeze }) {
  const seg = (active, label, blocked, onClick, activeBg, blockedTitle) => (
    <button type="button" role="tab" aria-selected={active} disabled={busy || active || blocked}
      title={blocked && !active ? blockedTitle : ''}
      onClick={active || blocked ? undefined : onClick}
      style={{
        padding: '5px 13px', minHeight: 28, minWidth: 82, fontSize: 11, fontWeight: 800,
        border: 'none', borderRadius: 7, transition: 'background .15s,color .15s',
        cursor: (active || blocked || busy) ? 'default' : 'pointer',
        background: active ? activeBg : 'transparent',
        color: active ? '#fff' : (blocked ? '#aeb3bd' : C.dim),
        boxShadow: active ? '0 1px 2px rgba(16,18,22,0.18)' : 'none',
      }}>
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Freeze state"
      style={{ display: 'inline-flex', gap: 3, padding: 3, borderRadius: 9, background: '#eef1f5', border: `1px solid ${C.border}`, opacity: busy ? 0.6 : 1 }}>
      {seg(!frozen, 'Un-Frozen', false, onUnfreeze, C.dim, '')}
      {seg(frozen, 'Frozen', !canFreeze, onFreeze, C.blue, 'reconcile every entry first')}
    </div>
  );
}

// Pass a bank ledger CODE, or a client/supplier ledger NAME. The month being frozen
// is chosen in the panel (seeded from `defaultPeriod` or the current month).
// `onShowUnreconciled(bool)` — optional; when given, a chip lets the user jump the
// matching tables to just the still-open lines (and back). `showingUnreconciled`
// reflects that filter so the chip can toggle it off.
export default function ReconFreezePanel({ branch, code, name, ledgerLabel, defaultPeriod, currency = 'INR', statementBalance, onShowUnreconciled, showingUnreconciled = false }) {
  const [st, setSt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod || thisMonth());
  const brCode = branch && (branch.code || branch);

  const refresh = useCallback(async () => {
    if (!brCode || brCode === 'ALL' || (!code && !name) || !period) { setSt(null); return; }
    setLoading(true);
    try { setSt(await getLedgerFreeze({ branch: brCode, code, name, period })); }
    finally { setLoading(false); }
  }, [brCode, code, name, period]);

  useEffect(() => { refresh(); }, [refresh]);

  // Freeze is per single branch — hide on the consolidated ALL view (freeze would 400).
  if (!brCode || brCode === 'ALL' || (!code && !name) || !period) return null;

  const un = st?.unreconciled || {};
  const label = ledgerLabel || name || code;
  // Usable freeze state = loaded AND the backend reached the DB. A null fetch (API
  // error) or a { connected:false } payload both mean "can't read status" — treat
  // them the same so the panel never shows a bare/greyed control with no reason.
  const ok = !!st && st.connected !== false;

  const doFreeze = async () => {
    if (!st?.canFreeze) return;
    const { confirmed } = await confirmDialog({
      title: `Freeze ${label} for ${period}?`,
      message: `Once frozen, entries on this ledger for ${period} can no longer be revoked or edited until it is un-frozen (or a Director/Owner re-opens it after certification).\n\nThe statement balance (${money(currency, Number(statementBalance) || 0)}) is locked into the snapshot.`,
      confirmLabel: 'Freeze', cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await freezeLedger({ branch: brCode, code, name, period, statementBalance: Number(statementBalance) || 0 });
      toast(`Frozen ${label} · ${period}`, 'success');
      await refresh();
    } catch (e) { toast(e?.message || 'Could not freeze', 'error'); }
    finally { setBusy(false); }
  };

  const doUnfreeze = async () => {
    const { confirmed } = await confirmDialog({
      title: `Un-freeze ${label}?`,
      message: `This releases the soft lock so ${period} entries on this ledger can be revoked/edited again.`,
      confirmLabel: 'Un-freeze', cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await unfreezeLedger({ branch: brCode, code, name, period });
      toast(`Un-frozen ${label}`, 'success');
      await refresh();
    } catch (e) { toast(e?.message || 'Could not un-freeze', 'error'); }
    finally { setBusy(false); }
  };

  const doSign = async () => {
    if (!st?.certId) return;
    setBusy(true);
    try {
      await signCertificate(st.certId);
      toast(`Signed ${label} as ${st.nextSigner || ''}`, 'success');
      await refresh();
    } catch (e) { toast(e?.message || 'Could not sign', 'error'); }
    finally { setBusy(false); }
  };

  const statusPill = st?.certified
    ? <span style={pill('#0f2f5c', '#fff')}><Lock size={10} style={{ verticalAlign: -1 }} /> Certified</span>
    : st?.frozen
      ? <span style={pill('#e6f1fb', '#185FA5')}><Snowflake size={10} style={{ verticalAlign: -1 }} /> Frozen{st.signatures ? ` · ${st.signatures} signed` : ''}</span>
      : ok
        ? <span style={pill('#eef1f5', C.dim)}>Open</span>
        : <span style={pill('#fdeab0', '#8a5a00')}>Status unavailable</span>;

  return (
    <div style={{ ...card, padding: '9px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderLeft: `3px solid ${st?.certified ? '#0f2f5c' : st?.frozen ? '#185FA5' : C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', minWidth: 220 }}>
        <Snowflake size={15} color={C.blue} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.dark }}>Freeze &amp; Certify</span>
        <span style={{ fontSize: 11.5, color: C.dim }}>{label}</span>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} disabled={busy}
          style={{ border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 6px', fontSize: 11.5 }} />
        {loading ? <span style={{ fontSize: 11, color: C.dim }}>…</span> : statusPill}
      </div>

      {/* Reconciled-gate message when open and not yet freezable + jump-to-blockers chip */}
      {ok && !st.frozen && !st.certified && (un.total == null
        ? <span style={{ fontSize: 11, color: C.dim }}>{un.error ? `Can't check: ${un.error}` : ''}</span>
        : un.total > 0
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#8a5a00', fontWeight: 700 }}>
              {un.total} entr{un.total === 1 ? 'y' : 'ies'} still unreconciled — reconcile all before freezing
              {onShowUnreconciled && (
                <button type="button"
                  onClick={() => onShowUnreconciled(!showingUnreconciled)}
                  style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                    border: `1px solid ${showingUnreconciled ? C.blue : '#f0d98a'}`,
                    background: showingUnreconciled ? '#e6f1fb' : '#fff', color: showingUnreconciled ? C.blue : '#8a5a00' }}>
                  {showingUnreconciled ? '✓ filtered — show all' : `Show the ${un.total} →`}
                </button>
              )}
            </span>
          : <span style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}><CheckCircle2 size={11} style={{ verticalAlign: -1 }} /> all entries reconciled — ready to freeze</span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Freeze state couldn't be read (API error → fail-soft null, or DB down →
            connected:false): never a silent dead-end — surface it and let the user retry. */}
        {!loading && !ok && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#8a5a00' }}>
            Couldn't load freeze status
            <button type="button" onClick={() => refresh()}
              style={{ ...aBtn(C.dim), background: '#fff', color: C.dim, border: `1px solid ${C.border}` }}>Retry</button>
          </span>
        )}
        {ok && !st.certified && (
          <FreezeTab frozen={!!st.frozen} canFreeze={!!st.canFreeze} busy={busy}
            onFreeze={doFreeze} onUnfreeze={doUnfreeze} />
        )}
        {ok && st.frozen && !st.certified && st.nextSigner && (
          <button onClick={doSign} disabled={busy} style={{ ...aBtn(C.green), opacity: busy ? 0.6 : 1 }}>
            <PenLine size={12} style={{ verticalAlign: -2 }} /> Sign as {st.nextSigner}
          </button>
        )}
        {ok && st.certified && (
          <span style={{ fontSize: 11, color: C.dim }}><Lock size={11} style={{ verticalAlign: -1 }} /> Re-open in the Certification register to change.</span>
        )}
      </div>
    </div>
  );
}
