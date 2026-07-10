// Cross-branch approval aggregation — the central "one queue" summary. Counts sum
// (currency-neutral); amounts are summed only within a currency (branchwise rule).
import {
  aggregateApprovals, branchesWithPending, stageFunnel, stagePipeline, PIPELINE_STAGES,
  bookingStageEntries, inbDealStageEntries, pipelineEntries,
} from '../utils/approvalPipeline';

const PER_BRANCH = [
  { code: 'BOM', cur: '₹', counts: { pending: { n: 11, amount: 800000 }, approved: { n: 387, amount: 0 }, rejected: { n: 5, amount: 0 }, deleted: { n: 7, amount: 0 } } },
  { code: 'AMD', cur: '₹', counts: { pending: { n: 5, amount: 200000 }, approved: { n: 40, amount: 0 } } },
  { code: 'NBO', cur: '$', counts: { pending: { n: 6, amount: 9000 } } },
  { code: 'BOMMB', cur: '₹', counts: {} }, // no counts at all
];

describe('aggregateApprovals', () => {
  const agg = aggregateApprovals(PER_BRANCH);

  test('pending counts sum across all branches (currency-neutral)', () => {
    expect(agg.totals.pendingN).toBe(11 + 5 + 6);
    expect(agg.totals.approvedN).toBe(387 + 40);
    expect(agg.totals.rejectedN).toBe(5);
    expect(agg.totals.deletedN).toBe(7);
  });

  test('amounts sum WITHIN a currency only — ₹ and $ never blended', () => {
    expect(agg.pendingByCurrency['₹']).toBe(800000 + 200000);
    expect(agg.pendingByCurrency['$']).toBe(9000);
    // never a single merged total
    expect(agg.pendingByCurrency['ALL']).toBeUndefined();
  });

  test('a branch with no counts is safe (all zeros)', () => {
    const bommb = agg.byBranch.find((b) => b.code === 'BOMMB');
    expect(bommb.pending).toEqual({ n: 0, amount: 0 });
  });

  test('empty / bad input does not throw', () => {
    expect(aggregateApprovals([]).totals.pendingN).toBe(0);
    expect(aggregateApprovals(undefined).byBranch).toEqual([]);
  });
});

describe('stageFunnel — pending under whom, from real reviewStage', () => {
  test('counts by reviewStage; blank/unknown → direct', () => {
    const entries = [
      { reviewStage: 'check' }, { reviewStage: 'verify' }, { reviewStage: 'verify' },
      { reviewStage: 'approve' }, { reviewStage: '' }, {},
    ];
    expect(stageFunnel(entries)).toEqual({ check: 1, verify: 2, approve: 1, direct: 2, total: 6 });
  });
  test('empty / bad input is safe', () => {
    expect(stageFunnel([])).toEqual({ check: 0, verify: 0, approve: 0, direct: 0, total: 0 });
    expect(stageFunnel(undefined).total).toBe(0);
  });
});

describe('stagePipeline — 5 people-stages (Branch→AE→Director→Owner→FM), by reviewStage', () => {
  const NOW = Date.parse('2026-07-07T00:00:00Z');
  const day = (n) => new Date(NOW - n * 86400000).toISOString();

  test('buckets each pending entry by its real reviewStage (backend bakes in the flag)', () => {
    const entries = [
      { reviewStage: 'check', total: 20000, date: day(3) },              // → Branch
      { reviewStage: 'verify', total: 40000, date: day(1) },             // → AE
      { reviewStage: 'approve', total: 200000, date: day(2) },           // → FM
      { reviewStage: 'director', total: 800000, date: day(1) },          // → Director (engaged, escalated)
      { reviewStage: 'owner', total: 2000000, date: day(4) },            // → Owner (engaged, over dual)
      { reviewStage: '', total: 10000, date: day(0) },                   // direct → FM
    ];
    const p = stagePipeline(entries, {}, NOW);
    const by = Object.fromEntries(p.map((s) => [s.key, s]));
    expect(by.branch.n).toBe(1);
    expect(by.ae.n).toBe(1);
    expect(by.fm.n).toBe(2);         // 200k approve + direct
    expect(by.director.n).toBe(1);   // 800k, stage director
    expect(by.owner.n).toBe(1);      // 2m, stage owner
    expect(by.owner.oldest).toBe(4); // oldest age tracked
    expect(p.map((s) => s.key)).toEqual(['branch', 'ae', 'director', 'owner', 'fm']); // FM posts last
  });

  test('DORMANT (flag off): a large approve entry stays at FM, never phantom-escalates', () => {
    const p = stagePipeline([{ reviewStage: 'approve', total: 9999999 }], {}, NOW);
    expect(p.find((s) => s.key === 'fm').n).toBe(1);
    expect(p.find((s) => s.key === 'director').n).toBe(0);
    expect(p.find((s) => s.key === 'owner').n).toBe(0);
  });

  test('empty / bad input is safe; FM is the posting gate', () => {
    expect(stagePipeline([]).every((s) => s.n === 0)).toBe(true);
    expect(stagePipeline(undefined).length).toBe(5);
    expect(PIPELINE_STAGES.find((s) => s.key === 'fm').gate).toBe(true);
  });
});

describe('bookingStageEntries — SO/PO/GP booking orders folded into the funnel', () => {
  const bookings = [
    { id: 'b1', status: 'pending', reviewStage: 'check', so: { total: 26300 }, date: '2026-07-02' },
    { id: 'b2', status: 'pending', reviewStage: '', so: { total: 17280 }, date: '2026-07-01' }, // direct → FM
    { id: 'b3', status: 'approved', so: { total: 99999 }, date: '2026-06-30' },                 // not pending — dropped
    { id: 'b4', status: 'pending', so: { total: -500 }, date: '2026-07-03' },                   // amount abs'd, no stage
  ];
  test('keeps only pending, maps sale total + reviewStage', () => {
    const e = bookingStageEntries(bookings);
    expect(e.map((x) => x.id)).toEqual(['b1', 'b2', 'b4']);
    expect(e.every((x) => x.source === 'sopogp')).toBe(true);
    expect(e[0]).toMatchObject({ reviewStage: 'check', total: 26300 });
    expect(e[2].total).toBe(500); // abs
  });
  test('these entries bucket by stage in the funnel (b1→Branch, b2/b4→FM)', () => {
    const p = stagePipeline(bookingStageEntries(bookings));
    const by = Object.fromEntries(p.map((s) => [s.key, s]));
    expect(by.branch.n).toBe(1);
    expect(by.fm.n).toBe(2);
  });
  test('safe on empty / bad input', () => {
    expect(bookingStageEntries([])).toEqual([]);
    expect(bookingStageEntries(undefined)).toEqual([]);
  });
});

describe('inbDealStageEntries — INB deals folded in, ONE entry per deal', () => {
  test('pairs sale + purchase legs of one deal into a single entry (no double count)', () => {
    const legs = [
      { id: 's1', vno: 'IS/1', category: 'sale', status: 'pending', bookingId: 'INB/BOM-NBO/26/0007', reviewStage: 'verify', total: 50000, date: '2026-07-05' },
      { id: 'p1', vno: 'IP/1', category: 'purchase', status: 'pending', bookingId: 'INB/BOM-NBO/26/0007', total: 48000, date: '2026-07-05' },
    ];
    const e = inbDealStageEntries(legs);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ source: 'inb', reviewStage: 'verify', total: 50000 }); // off the SALE leg
  });
  test('half-approved deal (sale posted, purchase still pending) still counts once', () => {
    const legs = [
      { vno: 'IS/2', category: 'sale', status: 'approved', bookingId: 'INB/X/1', total: 30000, date: '2026-07-01' },
      { vno: 'IP/2', category: 'purchase', status: 'pending', bookingId: 'INB/X/1', total: 29000, date: '2026-07-01' },
    ];
    expect(inbDealStageEntries(legs)).toHaveLength(1);
  });
  test('a fully-settled deal is dropped; refund/reissue legs are ignored', () => {
    const legs = [
      { vno: 'IS/3', category: 'sale', status: 'approved', bookingId: 'INB/Y/1', total: 10000 },
      { vno: 'IP/3', category: 'purchase', status: 'approved', bookingId: 'INB/Y/1', total: 9000 },
      { vno: 'RF/1', category: 'refund', status: 'pending', total: 5000 },   // counted in the gated queue, not here
    ];
    expect(inbDealStageEntries(legs)).toEqual([]);
  });
  test('lead-driven bucketing mirrors the INB tab: a rejected sale is NOT pending even if a leg lingers', () => {
    // Anomalous state — reject cascades to both legs in practice, but the funnel must
    // bucket by the LEAD leg (like voucherApprovals mk()), not "any leg pending".
    const legs = [
      { vno: 'IS/R', category: 'sale', status: 'rejected', bookingId: 'INB/R/1', total: 30000, date: '2026-07-01' },
      { vno: 'IP/R', category: 'purchase', status: 'pending', bookingId: 'INB/R/1', total: 29000, date: '2026-07-01' },
    ];
    expect(inbDealStageEntries(legs)).toEqual([]);
  });
  test('a pushed/posted deal (approved, no leg left pending) is not pending', () => {
    const legs = [
      { vno: 'IS/P', category: 'sale', status: 'approved', pushed: true, bookingId: 'INB/P/1', total: 40000 },
      { vno: 'IP/P', category: 'purchase', status: 'approved', pushed: true, bookingId: 'INB/P/1', total: 39000 },
    ];
    expect(inbDealStageEntries(legs)).toEqual([]);
  });
  test('migrated legs (per-leg Tally sourceRefs) pair on the sale againstPurchase', () => {
    const legs = [
      { vno: 'IS/9', category: 'sale', status: 'pending', againstPurchase: 'IP/9', total: 12000, date: '2026-07-02' },
      { vno: 'IP/9', category: 'purchase', status: 'pending', total: 11000, date: '2026-07-02' },
    ];
    expect(inbDealStageEntries(legs)).toHaveLength(1);
  });
  test('safe on empty / bad input', () => {
    expect(inbDealStageEntries([])).toEqual([]);
    expect(inbDealStageEntries(undefined)).toEqual([]);
  });
});

describe('pipelineEntries — the three queues merge; funnel total = sum of the tabs', () => {
  test('gated vouchers + SO/PO/GP + INB, each counted once', () => {
    const voucherEntries = [
      { reviewStage: 'approve', total: 5000, date: '2026-07-04' }, // FM
      { reviewStage: '', total: 1000, date: '2026-07-04' },        // FM (direct)
    ];
    const bookings = [
      { id: 'b1', status: 'pending', reviewStage: 'check', so: { total: 26300 }, date: '2026-07-02' }, // Branch
      { id: 'b2', status: 'approved', so: { total: 9 }, date: '2026-07-02' },                          // dropped
    ];
    const inbLegs = [
      { vno: 'IS/1', category: 'sale', status: 'pending', bookingId: 'INB/A/1', reviewStage: 'verify', total: 50000, date: '2026-07-05' }, // AE
      { vno: 'IP/1', category: 'purchase', status: 'pending', bookingId: 'INB/A/1', total: 48000, date: '2026-07-05' },
    ];
    const merged = pipelineEntries({ voucherEntries, bookings, inbLegs });
    expect(merged).toHaveLength(2 + 1 + 1); // 2 vouchers + 1 booking + 1 INB deal
    const p = stagePipeline(merged);
    const by = Object.fromEntries(p.map((s) => [s.key, s]));
    expect(by.branch.n).toBe(1);  // the SO/PO/GP booking (check)
    expect(by.ae.n).toBe(1);      // the INB deal (verify)
    expect(by.fm.n).toBe(2);      // the two gated vouchers
    expect(by.branch.n + by.ae.n + by.director.n + by.owner.n + by.fm.n).toBe(4);
  });
  test('safe on empty / missing sources', () => {
    expect(pipelineEntries()).toEqual([]);
    expect(pipelineEntries({ voucherEntries: [{ reviewStage: '', total: 1 }] })).toHaveLength(1);
  });
});

describe('branchesWithPending', () => {
  test('only branches with a backlog, worst first', () => {
    const rows = branchesWithPending(aggregateApprovals(PER_BRANCH));
    expect(rows.map((b) => b.code)).toEqual(['BOM', 'NBO', 'AMD']); // 11, 6, 5 — BOMMB (0) excluded
  });
  test('safe on empty', () => {
    expect(branchesWithPending(aggregateApprovals([]))).toEqual([]);
  });
});
