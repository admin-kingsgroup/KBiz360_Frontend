// ─── INB · Convert is the ONE door into the buyer's books ────────────────────────────
// A SOURCE guard, deliberately — this is a structural rule about which paths may exist, and
// no render test would have caught the regression that prompted it.
//
// WHAT HAPPENED. The SO/PO/GP entry screen carried a legacy "Fetch open INB" picker: pull an
// 'open' INB leg straight into an ordinary PO. It was effectively dead while push() seeded the
// buyer booking itself — a link only rested at 'open' if that seed threw, which the old code
// called the manual-fetch fallback. Then push() was changed to OFFER a deal and rest at 'open'
// until the buyer Converts. That flipped a rare failure path into the resting state of EVERY
// pushed deal, re-arming the picker as a second, unguarded door — and no test noticed, because
// nothing pinned "there is only one door".
//
// WHY IT MATTERED. `fetchInb` skipped everything convert() enforces:
//   • assertInbFxQuoted — a cross-currency deal booked the seller's rupees AS dollars (~95x)
//   • the returnedToSeller race guard — convert a deal the seller is mid-correction on
//   • the deleted/unpushed checks and the findActiveByLinkNo idempotency
// and its save called markBooked with the BUYER's booking no, overwriting `link.purchaseVno`
// (the SELLER's INB purchase leg, which drives resolveForRefund) — so a later refund silently
// lost its purchase side. The booking it created carried no linkNo, making it invisible to
// findActiveByLinkNo/findByLink and defeating returnToSeller's live-buyer gate, deleteDeal's
// buyer cascade and reopenInbForBooking.
//
// If someone reintroduces any of it, this fails loudly instead of the money going quiet.
import fs from 'fs';
import path from 'path';

// Assert on CODE, not prose. The tombstone comment left where the picker used to live names
// the very things being banned, so a raw source grep matches the warning and fails — which
// would push the next person to delete the explanation to get green. Strip comments first.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const read = (p) => stripComments(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));
const ENTRY = 'src/modules/accounts/daily-entry/soPoGpVoucherEntry.jsx';
const HOOKS = 'src/core/useInterBranchVoucher.js';

describe('the SO/PO/GP entry screen has no second door into an INB deal', () => {
  const src = read(ENTRY);

  test('no "Fetch open INB" picker', () => {
    expect(src).not.toMatch(/Fetch open INB/i);
  });

  test('no fetchInb — it hand-rolled the buyer seed and drifted from it (no fx, ~95x)', () => {
    expect(src).not.toMatch(/\bfetchInb\b/);
  });

  test('does not consume a link on save — markBooked clobbered purchaseVno', () => {
    expect(src).not.toMatch(/\bbookInb\b/);
    expect(src).not.toMatch(/purchaseVno:\s*booking\.bookingNo/);
  });

  test('does not read the open-INB worklist at all', () => {
    expect(src).not.toMatch(/\buseOpenInb\b/);
    expect(src).not.toMatch(/\bopenInbQ\b/);
  });

  // It may still CREATE and EDIT an inter-branch deal — that is the seller's entry screen.
  // Only the BUYER-side shortcut is gone.
  test('still creates + edits INB deals (the seller entry path is untouched)', () => {
    expect(src).toMatch(/\buseCreateInb\b/);
    expect(src).toMatch(/\buseUpdateInb\b/);
  });
});

describe('Convert is the only buyer-side entry', () => {
  test('useConvertInb targets the guarded /convert route', () => {
    expect(read(HOOKS)).toMatch(/useConvertInb[\s\S]{0,220}\/api\/inter-branch\/convert/);
  });

  // The buyer accepts a deal ONLY from INB · Incoming.
  test('the Incoming screen owns Convert', () => {
    expect(read('src/modules/accounts/inter-branch/inboundInterBranch.jsx')).toMatch(/\buseConvertInb\b/);
  });
});
