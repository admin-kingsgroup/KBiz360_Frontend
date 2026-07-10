import { matchVariance, matchVarianceGroup, matchVarianceSigned } from '../matchVariance';

// Phase 1 split guardrail: matchVariance is the signal used to decide whether a
// manual 1:1 match should warn ("looks like a split") before saving a partial.
describe('matchVariance — manual-match split signal', () => {
  test('ties out to 0 when magnitudes are equal (opposite sides)', () => {
    expect(matchVariance({ debit: 0, credit: 1000 }, { debit: 1000, credit: 0 })).toBe(0);
    expect(matchVariance({ debit: 500, credit: 0 }, { debit: 0, credit: 500 })).toBe(0);
  });

  test('positive when the book entry is smaller than the line (a split)', () => {
    // bank line 1000 vs one book leg of 600 → 400 shortfall
    expect(matchVariance({ debit: 0, credit: 1000 }, { debit: 600, credit: 0 })).toBe(400);
  });

  test('negative when the book entry is larger', () => {
    expect(matchVariance({ debit: 0, credit: 600 }, { debit: 1000, credit: 0 })).toBe(-400);
  });

  test('sub-cent rounding stays within the tie tolerance (<= 0.01)', () => {
    expect(Math.abs(matchVariance({ debit: 0, credit: 1000.004 }, { debit: 1000, credit: 0 }))).toBeLessThanOrEqual(0.01);
  });

  test('handles missing / blank sides', () => {
    expect(matchVariance({ credit: 1000 }, { debit: 1000 })).toBe(0);
    expect(matchVariance({}, {})).toBe(0);
  });
});

describe('matchVarianceGroup — N book legs vs one line', () => {
  test('legs that sum to the line tie out to 0', () => {
    expect(matchVarianceGroup({ debit: 0, credit: 1000 }, [
      { debit: 400, credit: 0 }, { debit: 350, credit: 0 }, { debit: 250, credit: 0 },
    ])).toBe(0);
  });
  test('short legs leave a positive residual', () => {
    expect(matchVarianceGroup({ debit: 0, credit: 1000 }, [
      { debit: 400, credit: 0 }, { debit: 350, credit: 0 },
    ])).toBe(250);
  });
  test('no legs = full line as variance', () => {
    expect(matchVarianceGroup({ debit: 0, credit: 1000 }, [])).toBe(1000);
  });
});

describe('matchVarianceSigned — direction-aware group variance', () => {
  const legsDr = [{ debit: 400, credit: 0 }, { debit: 350, credit: 0 }, { debit: 250, credit: 0 }];
  const legsCr = [{ debit: 0, credit: 400 }, { debit: 0, credit: 350 }, { debit: 0, credit: 250 }];

  test('debtor/tally (bookSign +1): debit legs settling a debit line tie out', () => {
    expect(matchVarianceSigned({ debit: 1000, credit: 0 }, legsDr, 1)).toBe(0);
  });

  test('creditor (bookSign -1): credit legs settling a debit line tie out', () => {
    expect(matchVarianceSigned({ debit: 1000, credit: 0 }, legsCr, -1)).toBe(0);
  });

  test('WRONG-direction legs do NOT tie even when magnitudes add up', () => {
    // debtor convention, but the user picked credit legs → 2× variance, never a tie
    expect(matchVarianceSigned({ debit: 1000, credit: 0 }, legsCr, 1)).toBe(2000);
    // magnitude version would have wrongly read this as a tie:
    expect(matchVarianceGroup({ debit: 1000, credit: 0 }, legsCr)).toBe(0);
  });

  test('short legs leave the signed residual', () => {
    expect(matchVarianceSigned({ debit: 1000, credit: 0 }, legsDr.slice(0, 2), 1)).toBe(250);
  });
});
