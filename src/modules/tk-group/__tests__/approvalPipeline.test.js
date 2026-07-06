// Cross-branch approval aggregation — the central "one queue" summary. Counts sum
// (currency-neutral); amounts are summed only within a currency (branchwise rule).
import { aggregateApprovals, branchesWithPending, stageFunnel, stagePipeline, PIPELINE_STAGES } from '../utils/approvalPipeline';

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

describe('stagePipeline — 5 people-stages (Branch→AE→FM→Director→Owner)', () => {
  const NOW = Date.parse('2026-07-07T00:00:00Z');
  const limits = { voucherEscalate: 500000, voucherDual: 1500000 };
  const day = (n) => new Date(NOW - n * 86400000).toISOString();

  test('maps chain stage → person; approve/direct escalate by amount', () => {
    const entries = [
      { reviewStage: 'check', total: 20000, date: day(3) },              // → Branch
      { reviewStage: 'verify', total: 40000, date: day(1) },             // → AE
      { reviewStage: 'approve', total: 200000, date: day(2) },           // → FM (under escalate)
      { reviewStage: 'approve', total: 800000, date: day(1) },           // → Director (over escalate)
      { reviewStage: 'approve', total: 2000000, date: day(4) },          // → Owner (over dual)
      { reviewStage: '', total: 10000, date: day(0) },                   // direct → FM
    ];
    const p = stagePipeline(entries, limits, NOW);
    const by = Object.fromEntries(p.map((s) => [s.key, s]));
    expect(by.branch.n).toBe(1);
    expect(by.ae.n).toBe(1);
    expect(by.fm.n).toBe(2);         // 200k approve + direct
    expect(by.director.n).toBe(1);   // 800k
    expect(by.owner.n).toBe(1);      // 2m
    expect(by.owner.oldest).toBe(4); // oldest age tracked
    expect(p.map((s) => s.key)).toEqual(['branch', 'ae', 'fm', 'director', 'owner']); // order
  });

  test('no limits → nothing escalates (all approve/direct land on FM)', () => {
    const p = stagePipeline([{ reviewStage: 'approve', total: 9999999 }], {}, NOW);
    expect(p.find((s) => s.key === 'fm').n).toBe(1);
    expect(p.find((s) => s.key === 'owner').n).toBe(0);
  });

  test('empty / bad input is safe; FM is the posting gate', () => {
    expect(stagePipeline([]).every((s) => s.n === 0)).toBe(true);
    expect(stagePipeline(undefined).length).toBe(5);
    expect(PIPELINE_STAGES.find((s) => s.key === 'fm').gate).toBe(true);
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
