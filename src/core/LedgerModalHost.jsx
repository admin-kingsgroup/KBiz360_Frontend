// ───────────────────────────────────────────────────────────────────────────
// FULL-SCREEN LEDGER MODAL — open any ledger from ANYWHERE, maximised.
//
// Mounted once (App.jsx). Any screen — a party list, the Outstanding board, the
// chart of accounts, a P&L drill, the Ctrl+L switcher — opens a ledger with:
//
//   import { openLedgerModal } from '../core/LedgerModalHost';
//   openLedgerModal('Global Konnection', { branch });
//
// The ledger shows in the SAME Tally UI as the on-screen Ledger A/c, at maximum
// size, and prints through the same template. Clicking a voucher number drills
// into the editable voucher; saving refreshes the statement live.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { LedgerAccountView } from './ledgerUI';
import { pushModal } from './ux/modalStore';
import { useDock } from './ux/dock';
import { VoucherEditor } from '../modules/accountingLive';
import { openModuleRegister } from './registerNav';
import { bc } from './styles';

const DARK = '#111111', DIM = '#6A6A6A';

// Fire from anywhere to open the maximised ledger. The branch is ALWAYS taken
// from the top-right global selector (shell) — never passed/overridden here, so
// no branch data is ever mixed. `from`/`to` are optional period hints.
// `invoiceToRegister`: when true, clicking a sale/purchase invoice inside the
// statement opens the Sales/Purchase Register (instead of the voucher editor) —
// used by the P&L drill so a ledger → invoice lands on its register.
export function openLedgerModal(name, { from, to, invoiceToRegister } = {}) {
  if (!name) return;
  try { window.dispatchEvent(new CustomEvent('kb:ledger-modal', { detail: { name, from, to, invoiceToRegister: !!invoiceToRegister } })); } catch { /* ignore */ }
}

export function LedgerModalHost({ branch: shellBranch }) {
  const [job, setJob] = useState(null);          // { name, from, to, invoiceToRegister }
  const [voucher, setVoucher] = useState(null);  // { id, vno }

  useEffect(() => {
    const onOpen = (e) => { const d = e.detail || {}; if (d.name) setJob({ name: d.name, from: d.from || '', to: d.to || '', invoiceToRegister: !!d.invoiceToRegister }); };
    window.addEventListener('kb:ledger-modal', onOpen);
    return () => window.removeEventListener('kb:ledger-modal', onOpen);
  }, []);

  useEffect(() => {
    if (!job) return undefined;
    const pop = pushModal(() => { if (voucher) setVoucher(null); else setJob(null); }); // Esc closes voucher first, then modal
    return () => pop();
  }, [job, voucher]);

  const dock = useDock();

  if (!job) return null;
  const branch = shellBranch;                    // live global branch — single source of truth
  const branchCode = typeof shellBranch === 'string' ? shellBranch : (shellBranch && shellBranch.code) || '';
  const cur = bc(branch).cur;
  const close = () => { setVoucher(null); setJob(null); };

  // Minimize: park this ledger (pinned to the CURRENT branch) and hide the
  // overlay. Restoring re-opens it from the ContextBar tray and re-fetches.
  const minimize = () => {
    if (voucher && !window.confirm('A voucher is open. Minimize and discard the open voucher view?')) return;
    dock.park({ kind: 'ledger', label: job.name, branch: branchCode, payload: { name: job.name, from: job.from, to: job.to } });
    setVoucher(null); setJob(null);
  };
  const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 20, lineHeight: 1, padding: '0 2px' };

  return (
    <div onMouseDown={close} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.55)', zIndex: 8800, display: 'flex', flexDirection: 'column', padding: '1.4vh 1.2vw' }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.4)', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 16px', borderBottom: '1px solid #DEDBD4', background: '#FDFAF4' }}>
          <strong style={{ fontSize: 13.5, color: DARK, letterSpacing: '.3px' }}>📒 Ledger — {job.name}</strong>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={minimize} title="Minimize to bar" aria-label="Minimize to bar" style={{ ...iconBtn, fontSize: 18 }}>▁</button>
            <button onClick={close} title="Close (Esc)" aria-label="Close" style={iconBtn}>✕</button>
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <LedgerAccountView
            name={job.name}
            branch={branch}
            from={job.from}
            to={job.to}
            cur={cur}
            showPeriod
            onPickVoucher={setVoucher}
            onPickInvoice={job.invoiceToRegister
              ? (inv) => { close(); openModuleRegister(inv.category, inv.vno); }
              : undefined}
            maxHeight="calc(100vh - 360px)"
          />
        </div>
      </div>

      {voucher && (
        <div onMouseDown={(e) => { e.stopPropagation(); setVoucher(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.5)', zIndex: 8900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
          <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 'min(880px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid #e5e9f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <strong style={{ fontSize: 13, color: '#0d1326' }}>{job.name} · {voucher.vno}</strong>
              <button onClick={() => setVoucher(null)} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18 }}>✕</button>
            </div>
            <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} onClose={() => setVoucher(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
