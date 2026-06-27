/* Feature 2 — same-party Net Ageing join (Debtors − Creditors). */
import { computeNetAgeing } from '../modules/reportsFinancial/netAgeing';

const make = (rows) => ({ rows });

describe('computeNetAgeing — same-party netting', () => {
  test('nets receivable minus payable for the SAME party', () => {
    const d = {
      receivables: make([{ party: 'Acme', total: 1000, onAccount: 0, net: 1000 }]),
      payables: make([{ party: 'Acme', total: 400, onAccount: 0, net: 400 }]),
    };
    const { rows, totals } = computeNetAgeing(d);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ party: 'Acme', receivable: 1000, payable: 400, net: 600 });
    expect(totals).toMatchObject({ receivable: 1000, payable: 400, net: 600 });
  });

  test('does NOT net across different parties/branches', () => {
    const d = {
      receivables: make([{ party: 'Customer X', net: 1000, total: 1000, onAccount: 0 }]),
      payables: make([{ party: 'Travkings Tours and Travels BOM', net: 700, total: 700, onAccount: 0 }]),
    };
    const { rows, totals } = computeNetAgeing(d);
    expect(rows).toHaveLength(2);
    const x = rows.find((r) => r.party === 'Customer X');
    const ib = rows.find((r) => r.party === 'Travkings Tours and Travels BOM');
    expect(x.net).toBe(1000);   // stays a receivable, not netted
    expect(ib.net).toBe(-700);  // stays a payable, not netted
    expect(totals.net).toBe(300); // group net, but per-party untouched
  });

  test('uses NET (open bills − on-account advances) per side', () => {
    const d = {
      receivables: make([{ party: 'Acme', total: 1000, onAccount: 200 }]), // net 800
      payables: make([{ party: 'Acme', total: 500, onAccount: 100 }]),      // net 400
    };
    const { rows } = computeNetAgeing(d);
    expect(rows[0]).toMatchObject({ receivable: 800, payable: 400, net: 400 });
  });

  test('drops parties that net to (effectively) zero on both sides', () => {
    const d = {
      receivables: make([{ party: 'Zero', total: 0, onAccount: 0, net: 0 }]),
      payables: make([]),
    };
    expect(computeNetAgeing(d).rows).toHaveLength(0);
  });

  test('handles empty/undefined input', () => {
    expect(computeNetAgeing(undefined)).toEqual({ rows: [], totals: { receivable: 0, payable: 0, net: 0 } });
  });

  // Consolidated Net Ageing renders one section PER BRANCH from the ageing `byBranch`
  // breakdown. Each byBranch entry has the same {receivables,payables} shape, so the
  // per-branch Net section is just computeNetAgeing(entry) — netted WITHIN that branch,
  // never across branches/currencies. This locks that in.
  test('per-branch byBranch entry nets within the branch only (consolidated section math)', () => {
    const byBranch = [
      { branch: 'BOM', receivables: make([{ party: 'Acme', total: 1000, onAccount: 0, net: 1000 }]),
                       payables:    make([{ party: 'Acme', total: 400,  onAccount: 0, net: 400 }]) },
      { branch: 'NBO', receivables: make([{ party: 'Inaysha', total: 500, onAccount: 0, net: 500 }]),
                       payables:    make([]) },
    ];
    const bom = computeNetAgeing(byBranch[0]);
    const nbo = computeNetAgeing(byBranch[1]);
    // BOM nets its own Acme (1000 − 400 = 600); NBO is a separate branch, untouched.
    expect(bom.totals).toMatchObject({ receivable: 1000, payable: 400, net: 600 });
    expect(nbo.totals).toMatchObject({ receivable: 500, payable: 0, net: 500 });
    // No cross-branch merge: the same party in two branches is NOT combined here —
    // each section is computed from only its own branch's rows.
    expect(bom.rows.map((r) => r.party)).toEqual(['Acme']);
    expect(nbo.rows.map((r) => r.party)).toEqual(['Inaysha']);
  });
});
