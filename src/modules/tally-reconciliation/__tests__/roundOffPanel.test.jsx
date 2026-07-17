// Rounding settlement panel — it must never let the operator post a sweep without
// showing what it does, and it must be honest when a sweep does NOT clear the period.
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/useAccounting', () => ({ invalidateBooks: jest.fn() }));
jest.mock('../api', () => ({
  previewRoundOff: jest.fn(),
  settleRoundOff: jest.fn(() => Promise.resolve({ committed: true })),
  reverseRoundOff: jest.fn(() => Promise.resolve({ reversed: true })),
}));

const { previewRoundOff, settleRoundOff } = require('../api');
const { RoundOffPanel } = require('../tie-out/RoundOffPanel');

const FM = { role: 'FM', name: 'Faiz' };
const AE = { role: 'AE', name: 'Sughra' };
const OWNER = { role: 'Super Admin', name: 'Afshin' };
const DIRECTOR = { role: 'Director', name: 'Farhan' };

// A full sweep of BOM · Dec-2025: residues net to zero → no plug, period ties.
const CLEARS = {
  maxDiff: 2.5, before: { off: 15, absDiff: 7.94 },
  after: { offAfter: 0, onlyErpAfter: 0, onlyTallyAfter: 0, absDiffAfter: 0, tiesAfter: true },
  lines: [
    { ledger: 'B2C Ref Farhan', amt: 2, drCr: 'Dr' },
    { ledger: 'Round Off', amt: 2.33, drCr: 'Cr' },
  ],
  plug: 0, total: 2, settles: [], skipped: [], existing: null,
  currency: '₹', maxThreshold: 10, defaultThreshold: 0.5,
};
// A partial sweep: 10 rows clear, 5 real differences survive, remainder plugs to Round Off.
const PARTIAL = {
  maxDiff: 0.5, before: { off: 15, absDiff: 7.94 },
  after: { offAfter: 5, onlyErpAfter: 0, onlyTallyAfter: 0, absDiffAfter: 7.54, tiesAfter: false },
  lines: [{ ledger: 'CGST Input [BOM]', amt: 0.17, drCr: 'Cr' }, { ledger: 'Round Off', amt: 0.18, drCr: 'Dr' }],
  plug: 0.18, total: 0.18, settles: [],
  skipped: [{ ledger: 'B2C Ref Farhan', diff: -2, status: 'off', reason: '₹2.00 exceeds the ₹0.50 rounding threshold' }],
  existing: null,
};

const mount = (user = FM, props = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RoundOffPanel branch="BOM" period="2025-12" tier="month" currentUser={user} {...props} />
    </QueryClientProvider>,
  );
};

beforeEach(() => jest.clearAllMocks());

test('a sweep that clears the period says so, and notes no plug is needed', async () => {
  previewRoundOff.mockResolvedValue(CLEARS);
  mount();
  expect(await screen.findByText(/This makes every amount tie/i)).toBeInTheDocument();
  expect(screen.getByText(/the legs net to nil, so no plug is needed/i)).toBeInTheDocument();
  expect(screen.getByText(/Would tie/i)).toBeInTheDocument();
});

test('a partial sweep is called out as NOT clearing, and warns the plug moves Round Off further off', async () => {
  previewRoundOff.mockResolvedValue(PARTIAL);
  mount();
  expect(await screen.findByText(/This will not make the period tie/i)).toBeInTheDocument();
  expect(screen.getByText(/moves that row further from Tally/i)).toBeInTheDocument();
  expect(screen.getByText(/real\s+differences, not rounding/i)).toBeInTheDocument();
});

test('every leg that would post is listed before committing', async () => {
  previewRoundOff.mockResolvedValue(CLEARS);
  mount();
  expect(await screen.findByText('B2C Ref Farhan')).toBeInTheDocument();
  expect(screen.getByText('2.33')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Post settlement JV \(2 legs\)/i })).toBeEnabled();
});

test('skipped ledgers are disclosed with the reason they were left alone', async () => {
  previewRoundOff.mockResolvedValue(PARTIAL);
  mount();
  expect(await screen.findByText(/1 ledger left for correction at source/i)).toBeInTheDocument();
  expect(screen.getByText(/exceeds the ₹0.50 rounding threshold/i)).toBeInTheDocument();
});

test('AE can see the position but cannot post it', async () => {
  previewRoundOff.mockResolvedValue(CLEARS);
  mount(AE);
  expect(await screen.findByText(/FM, Director or Owner only/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Post settlement JV/i })).toBeDisabled();
});

test('posting sends the chosen threshold, not the default', async () => {
  previewRoundOff.mockResolvedValue(CLEARS);
  mount();
  await screen.findByText(/This makes every amount tie/i);
  fireEvent.change(screen.getByLabelText(/Rounding threshold/i), { target: { value: '2.5' } });
  fireEvent.click(screen.getByRole('button', { name: /Post settlement JV/i }));
  await waitFor(() => expect(settleRoundOff).toHaveBeenCalledWith(
    expect.objectContaining({ branch: 'BOM', period: '2025-12', maxDiff: '2.5' }),
  ));
});

test('an already-settled period offers reversal instead of a second posting', async () => {
  // Back-compat: the OLD single-object `existing` shape must still render. During a deploy
  // the panel can be served a response from the previous BE.
  previewRoundOff.mockResolvedValue({ ...CLEARS, existing: { vno: 'JV/BOM/26/1371', date: '2025-12-31', total: 2 } });
  mount();
  expect(await screen.findByText(/Settled · JV\/BOM\/26\/1371/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Reverse settlement/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Post settlement JV/i })).toBeNull();
});

// A settlement is now one voucher PER COST CENTRE — the residue has to carry a real tag or
// the tie-out can't attribute it to a module (a ₹0.02 crumb on IT-Taxes once presented as a
// ₹3.34 lakh module gap). So the panel must never imply a settlement is a single JV.
test('a multi-voucher settlement names EVERY vno — reversing must not look like it drops one', async () => {
  previewRoundOff.mockResolvedValue({ ...CLEARS, existing: [
    { vno: 'JV/BOM/26/1388', date: '2026-01-31', total: 0.02, costCenter: 'BOM-FLT-INT' },
    { vno: 'JV/BOM/26/1389', date: '2026-01-31', total: 0.24, costCenter: 'BOM-INB-FLT-INT' },
    { vno: 'JV/BOM/26/1390', date: '2026-01-31', total: 1.19, costCenter: '' },
  ] });
  mount();
  expect(await screen.findByText(/Settled · 3 JVs/i)).toBeInTheDocument();
  for (const vno of ['JV/BOM/26/1388', 'JV/BOM/26/1389', 'JV/BOM/26/1390']) {
    expect(screen.getByText(vno)).toBeInTheDocument();
  }
  expect(screen.getByText(/BOM-FLT-INT/)).toBeInTheDocument();
  // The untagged group must say so in words, never render a blank cell.
  expect(screen.getByText(/no cost centre/i)).toBeInTheDocument();
  // The button has to state the blast radius: it removes all three.
  expect(screen.getByRole('button', { name: /Reverse all 3 JVs/i })).toBeInTheDocument();
});

const TWO_GROUPS = { ...CLEARS, plug: 0.02, groups: [
  { costCenter: 'BOM-FLT-INT', plug: -0.02, lines: [{ ledger: 'IT-Taxes', amt: 0.02, drCr: 'Dr' }, { ledger: 'Round Off', amt: 0.02, drCr: 'Cr' }] },
  { costCenter: '', plug: 0.04, lines: [{ ledger: 'TRIP JACK', amt: 0.15, drCr: 'Dr' }, { ledger: 'Round Off', amt: 0.15, drCr: 'Cr' }] },
] };

test('the pre-post preview groups legs by cost centre and says how many JVs will post', async () => {
  previewRoundOff.mockResolvedValue(TWO_GROUPS);
  mount();
  // PLURAL — "journal vouchers" only renders when >1 group, so this fails if the grouping
  // collapses. (The exact count is asserted on the Post button in the next test, which is
  // the string the operator actually commits with.)
  expect(await screen.findByText(/journal vouchers/i)).toBeInTheDocument();
  expect(screen.getByText('BOM-FLT-INT')).toBeInTheDocument();
  expect(screen.getByText(/no cost centre/i)).toBeInTheDocument();
  // Round Off carries a balancing leg in BOTH groups — it must render twice, not collapse.
  expect(screen.getAllByText('Round Off')).toHaveLength(2);
});

// The commit button must name what actually posts. It said "Post settlement JV (12 legs)"
// — singular, counting legs — directly under "Posts 3 journal vouchers".
test('the Post button names the VOUCHER count, not "a JV" of N legs', async () => {
  previewRoundOff.mockResolvedValue(TWO_GROUPS);
  mount();
  expect(await screen.findByRole('button', { name: /Post 2 settlement JVs \(one per cost centre\)/i })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /Post settlement JV \(/i })).toBeNull();
});

// REGRESSION: the legs table was moved from the flat `lines` onto `groups`. A response
// carrying only `lines` (the previous BE, mid-deploy) must still show what would post —
// rendering nothing there would be a silent screen.
test('falls back to the flat legs when the BE sends no groups', async () => {
  previewRoundOff.mockResolvedValue({ ...CLEARS });          // lines only, no groups
  mount();
  expect(await screen.findByText('B2C Ref Farhan')).toBeInTheDocument();
  expect(screen.getByText('Round Off')).toBeInTheDocument();
});

// NEVER LEAVE A SCREEN SILENT. This was the one uncovered cell of the role x certified
// grid, and it was the broken one: an AE on a SETTLED, UNCERTIFIED period got an empty div
// — no Reverse button and no reason — while the text above it read "Reversing removes all 3".
test('an AE on a settled period is TOLD why it cannot reverse — never a blank space', async () => {
  previewRoundOff.mockResolvedValue({ ...CLEARS, existing: [
    { vno: 'JV/BOM/26/1389', date: '2026-01-31', total: 0.02, costCenter: 'BOM-FLT-INT' },
    { vno: 'JV/BOM/26/1390', date: '2026-01-31', total: 0.24, costCenter: '' },
  ] });
  mount(AE);                                                  // AE, period NOT certified
  expect(await screen.findByText(/Settled · 2 JVs/i)).toBeInTheDocument();
  expect(screen.getByText(/FM, Director or Owner only/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Reverse/i })).toBeNull();
  // ...and it must NOT send them chasing a certificate re-open, which wouldn't unblock them.
  expect(screen.queryByText(/re-open the Tally certificate/i)).toBeNull();
});

// The panel guessed "the threshold may be out of range" for EVERY failure, so a 503 sent the
// operator off editing a threshold that was never the problem. Say WHAT and WHY.
test('a failed preview shows the real reason, not a guess about the threshold', async () => {
  previewRoundOff.mockRejectedValue(new Error('no database connection'));
  mount();
  expect(await screen.findByText(/no database connection/i)).toBeInTheDocument();
  expect(screen.queryByText(/threshold may be out of range/i)).toBeNull();
});

// REGRESSION: the panel hardcoded ₹ and a ₹10 cap. NBO/DAR/FBM keep USD books, where
// that cap would be ~₹950 of tolerance — loose enough to swallow a real defect.
// The BE builds the skipped REASON string, and it hardcoded ₹ — so a USD book read
// "₹0.30 exceeds the ₹0.05 rounding threshold" for dollars. The panel renders the reason
// verbatim, so the fixture must carry the branch's own symbol or this can never catch it.
test('a USD book\'s skipped reason carries $ — the reason string comes from the BE', async () => {
  previewRoundOff.mockResolvedValue({ ...PARTIAL, currency: '$', maxThreshold: 0.25, defaultThreshold: 0.05,
    skipped: [{ ledger: 'NBO Debtors', diff: -0.3, status: 'off', reason: '$0.30 exceeds the $0.05 rounding threshold' }] });
  mount(FM, { branch: 'NBO' });
  expect(await screen.findByText(/exceeds the \$0\.05 rounding threshold/i)).toBeInTheDocument();
  expect(screen.queryByText(/₹/)).toBeNull();
});

test('renders the BRANCH currency and cap, not a hardcoded ₹', async () => {
  previewRoundOff.mockResolvedValue({ ...CLEARS, currency: '$', maxThreshold: 0.25, defaultThreshold: 0.05, plug: 0.03 });
  mount(FM, { branch: 'NBO' });
  expect(await screen.findByLabelText(/Rounding threshold \(\$\)/i)).toBeInTheDocument();
  expect(screen.getByText(/Capped at \$0\.25/i)).toBeInTheDocument();
  expect(screen.queryByText(/Capped at ₹10/i)).toBeNull();
});

// REGRESSION: the FE gate (isSettlerRole) allowed Owner/Director while the BE gate used
// roleSatisfies(role,'FM') — an exact matcher that refuses both. Button on, then 403.
test.each([[OWNER, 'Owner'], [DIRECTOR, 'Director'], [FM, 'FM']])('%#: a settler role can post (%s)', async (user) => {
  previewRoundOff.mockResolvedValue(CLEARS);
  mount(user);
  await screen.findByText(/This makes every amount tie/i);
  expect(screen.getByRole('button', { name: /Post settlement JV/i })).toBeEnabled();
});

// REGRESSION: the panel offered Post on a certified period; the BE 409s. A click that can
// only produce an error is a worse answer than the sentence.
test('a certified period disables posting and says why', async () => {
  previewRoundOff.mockResolvedValue(CLEARS);
  mount(OWNER, { certified: true });
  expect(await screen.findByText(/certified — re-open the Tally certificate before settling/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Post settlement JV/i })).toBeDisabled();
});

test('a certified period does not offer reversal either', async () => {
  previewRoundOff.mockResolvedValue({ ...CLEARS, existing: { vno: 'JV/BOM/26/1383', date: '2025-12-31', total: 0.42 } });
  mount(OWNER, { certified: true });
  expect(await screen.findByText(/certified — re-open the Tally certificate before reversing/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Reverse settlement/i })).toBeNull();
});

test('a period with no residue renders nothing at all', async () => {
  previewRoundOff.mockResolvedValue({
    ...CLEARS, before: { off: 0, absDiff: 0 }, lines: [], existing: null,
  });
  const { container } = mount();
  await waitFor(() => expect(previewRoundOff).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
