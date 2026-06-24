import { buildRefundReissueBody } from '../fields/refundBody';

const ctx = { branchCode: 'BOM' };
const base = {
  date: '2026-04-14', party: 'Cust', counterParty: 'IATA-BSP [Stock]',
  supplierAmt: 74227, serviceCharge: 250, markup: 120, gstPct: 18,
  supplierSvc: 0, supplierGst: 0, supplierCancel: 300, supplierCancelGst: 54,
  incentiveAmt: 1275, incentiveGst: 0, incentiveTds: 25.5,
  gstMode: 'inter', againstInvoice: 'BOM/0626/SF00495', againstPurchase: 'BOM/0626/PF00495',
};

describe('buildRefundReissueBody', () => {
  test('refund: builds the RF body the engine posts', () => {
    const b = buildRefundReissueBody(base, ctx, 'refund');
    expect(b).toMatchObject({
      type: 'RF', category: 'refund', branch: 'BOM',
      supplierAmt: 74227, supplierCancel: 300, supplierCancelGst: 54,
      incentiveAmt: 1275, incentiveTds: 25.5, gstPct: 18,
      againstInvoice: 'BOM/0626/SF00495', againstPurchase: 'BOM/0626/PF00495', linkNo: 'BOM/0626/SF00495',
    });
    // our income legs only added when > 0
    expect(b.lines).toEqual([
      { ledger: 'SVF Income', amt: 250, desc: 'Service Fee' },
      { ledger: 'SVC2 Income', amt: 120, desc: 'Service Charge - 2' },
    ]);
    // GST split by component: Service-Fee GST → taxAmt, SVC2 margin GST → otherTaxesGst
    expect(b.taxAmt).toBe(45);          // 250 × 18%
    expect(b.otherTaxesGst).toBe(21.6); // 120 × 18% → SVC2 GST ledgers
    // refund customer figure: supplierAmt − ourIncome − taxAmt − otherTaxesGst
    // ourIncome = 370, total GST = 66.6 → 74227 - 370 - 45 - 21.6
    expect(b.total).toBe(73790.4);
  });

  test('reissue: drops refund-only legs (cancel / commission) and flips the total', () => {
    const b = buildRefundReissueBody(base, ctx, 'reissue');
    expect(b.type).toBe('RI');
    expect(b.supplierCancel).toBe(0);
    expect(b.supplierCancelGst).toBe(0);
    expect(b.incentiveAmt).toBe(0);
    // reissue billed = supplierAmt − supSvc − supGst + ourIncome + taxAmt
    expect(b.total).toBe(74663.6);
  });

  test('no income legs when service charge and markup are both 0', () => {
    const b = buildRefundReissueBody({ ...base, serviceCharge: 0, markup: 0 }, ctx, 'refund');
    expect(b.lines).toEqual([]);
    expect(b.taxAmt).toBe(0);
  });
});
