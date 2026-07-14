/* ════════════════════════════════════════════════════════════════
   LEDGER ACCOUNT  /ledger
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { card, inp } from '../../../core/styles';
import { LedgerAccountView } from '../../../core/ledgerUI';
import { resolveLedgerSelection } from '../../../core/ledgerPicker';
import { LedgerPicker } from '../../../core/voucher/LedgerPicker';
import { usePrefs } from '../../../core/prefs';
import { pushModal } from '../../../core/ux/modalStore';
import { useNavFocus, useNavFocusStore } from '../../../core/ux/navFocus';
import { openBookingFolder } from '../../../core/BookingFolderHost';
import { VoucherEditor } from '../../accountingLive';
import { DIM, GREEN, curOf, Page, Crumb } from '../../accountingLive/shared';

export function LedgerAcLive({ branch }) {
  const cur = curOf(branch);
  const { setPref } = usePrefs();

  const [pick, setPick] = useState('');     // combobox choice (not yet viewed)
  const [shown, setShown] = useState('');   // ledger actually fetched + rendered below
  const { selected, display, dirty } = resolveLedgerSelection({ pick, shown });
  const view = () => { if (selected) { setShown(selected); setPref('lastLedger', selected); } };
  // "Open ledger" from any screen (legacy in-page event) opens it immediately.
  useEffect(() => {
    const onOpen = (e) => { const n = e.detail?.name; if (n) { setPick(n); setShown(n); setPref('lastLedger', n); } };
    window.addEventListener('kb:open-ledger', onOpen);
    return () => window.removeEventListener('kb:open-ledger', onOpen);
  }, [setPref]);
  // Deep-link via nav-focus (e.g. Travkings Group Table View drill → tap a balance):
  // setNavFocus('/ledger', { name }) then navigate here → open that ledger once, then clear.
  const navLedger = useNavFocus('/ledger');
  useEffect(() => {
    const n = navLedger && navLedger.name;
    if (n) { setPick(n); setShown(n); setPref('lastLedger', n); useNavFocusStore.getState().clear(); }
  }, [navLedger, setPref]);
  const [voucher, setVoucher] = useState(null); // clicked Voucher No → editable voucher modal
  const closeVoucher = () => setVoucher(null);
  useEffect(() => (voucher ? pushModal(closeVoucher) : undefined), [voucher]); // Esc closes the voucher modal

  return (
    <Page
      title="Ledger Account"
      sub={display || 'Select a ledger'}
      wide
      right={<>
        <LedgerPicker value={pick} onChange={setPick} branch={branch} placeholder="Search ledger…" style={{ width: 260, fontSize: 11 }} />
        {/* "View" arms green once a ledger is selected (and differs from what's shown). */}
        <button onClick={view} disabled={!dirty} title="View this ledger's account statement" className="max-tablet:min-h-[44px]"
          style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', background: dirty ? GREEN : '#eef1f6', color: dirty ? '#fff' : DIM, borderColor: dirty ? GREEN : '#cdd1d8' }}>
          View
        </button>
      </>}
    >
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {display
          ? <LedgerAccountView name={display} branch={branch} cur={cur} showPeriod onPickVoucher={setVoucher} onPickFolder={(inv) => openBookingFolder(inv.vno, { branch, voucherId: inv.id, vno: inv.vno })} maxHeight="calc(100vh - 330px)" />
          : <div style={{ padding: '64px 24px', textAlign: 'center', color: DIM, fontSize: 13, lineHeight: 1.7 }}>
              Search and select a ledger above, then press <b style={{ color: GREEN }}>View</b><br />to open its account statement.
            </div>}
      </div>
      {voucher && (
        <div onClick={closeVoucher} style={{ position: 'fixed', inset: 0, background: 'rgba(16,18,22,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ ...card, width: 'min(820px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <Crumb items={[{ label: display || 'Ledger', onClick: closeVoucher }, { label: voucher.vno }]} />
              <button onClick={closeVoucher} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
            </div>
            <VoucherEditor voucherId={voucher.id} cur={cur} onBack={closeVoucher} onClose={closeVoucher} />
          </div>
        </div>
      )}
    </Page>
  );
}
