// Verifies the reconciliation menu placement: EVERY non-tax reconciliation
// screen (client · bank · supplier · inter-branch · Tally matching + the
// certificate ladder) lives under the TOP-LEVEL Reconciliation pill — the
// Accounts pill carries none of them anymore. Tax/GST reconciliation stays
// grouped under the regime-aware Taxation pill, exactly as before.
import { MENU_ACCOUNTS, MENU_RECONCILIATION, getMenu, expandHidden } from '../core/menus';
import { TAX_INDIA } from '../core/data';
import { crumbsFor } from '../core/routeMeta';

const groupByLabel = (menu, label) => menu.children.find((c) => c.label === label);
const hrefs = (group) => (group?.children || []).map((c) => c.href).filter(Boolean);

function allHrefs(node, out = []) {
  if (!node) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => allHrefs(c, out));
  return out;
}

const MATCHING = ['/accounts/client-reco', '/bank-reco', '/accounts/supplier-reco', '/finance/reco-queue', '/accounts/interbranch-reco', '/accounts/tally-reco'];

describe('Reconciliation pill ▸ Statement Matching (moved out of Accounts)', () => {
  const matching = groupByLabel(MENU_RECONCILIATION, 'Statement Matching');

  test('the Statement Matching group exists under the Reconciliation pill', () => {
    expect(matching).toBeTruthy();
    expect(hrefs(matching)).toEqual(expect.arrayContaining(MATCHING));
  });

  test('Reconciliation Hub: a full-view dashboard, one entry per tier (first sub-head)', () => {
    const hub = groupByLabel(MENU_RECONCILIATION, 'Reconciliation Hub');
    expect(hrefs(hub)).toEqual([
      '/reconciliation/hub/weekly', '/reconciliation/hub/monthly',
      '/reconciliation/hub/quarterly', '/reconciliation/hub/yearly',
    ]);
    // Hub is the FIRST sub-head under the pill (watch first, then certify).
    expect(MENU_RECONCILIATION.children[0].label).toBe('Reconciliation Hub');
  });

  test('Certification: one entry per tier + the Rule Book', () => {
    const certs = groupByLabel(MENU_RECONCILIATION, 'Certification');
    expect(hrefs(certs)).toEqual([
      '/reconciliation/weekly', '/reconciliation/monthly',
      '/reconciliation/quarterly', '/reconciliation/yearly',
      '/reconciliation/rulebook',
    ]);
  });

  test('Reports: a separate sub head with one report per tier', () => {
    const reports = groupByLabel(MENU_RECONCILIATION, 'Reports');
    expect(hrefs(reports)).toEqual([
      '/reconciliation/reports/weekly', '/reconciliation/reports/monthly',
      '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly',
    ]);
  });

  test('stale PRE-SPLIT deny-list keys keep covering the per-tier pages (no silent un-hide on deploy)', () => {
    const h = expandHidden(['/reconciliation']);
    ['/reconciliation/weekly', '/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly']
      .forEach((p) => expect(h.has(p)).toBe(true));
    const r = expandHidden(['/reconciliation/reports']);
    ['/reconciliation/reports/weekly', '/reconciliation/reports/monthly', '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly']
      .forEach((p) => expect(r.has(p)).toBe(true));
    // …and hiding the weekly replacement blocks the legacy alias that renders it.
    expect(expandHidden(['/reconciliation/weekly']).has('/reconciliation')).toBe(true);
    expect(expandHidden(['/reconciliation/reports/weekly']).has('/reconciliation/reports')).toBe(true);
    // untouched lists pass through
    expect(expandHidden(['/bank-reco']).size).toBe(1);
  });

  test('the Accounts pill carries NO reconciliation screens anymore', () => {
    const all = allHrefs(MENU_ACCOUNTS);
    MATCHING.forEach((h) => expect(all).not.toContain(h));
    expect(groupByLabel(MENU_ACCOUNTS, 'Reconciliation')).toBeUndefined();
  });

  test('each recon route appears exactly once in the Reconciliation pill', () => {
    const all = allHrefs(MENU_RECONCILIATION);
    MATCHING.forEach((h) => expect(all.filter((x) => x === h)).toHaveLength(1));
  });

  test('breadcrumbs resolve to Reconciliation › Statement Matching › <leaf>', () => {
    expect(crumbsFor('/accounts/client-reco').map((c) => c.label)).toEqual(
      ['Reconciliation', 'Statement Matching', 'Client Reconciliation'],
    );
    expect(crumbsFor('/bank-reco').map((c) => c.label)).toEqual(
      ['Reconciliation', 'Statement Matching', 'Bank Reconciliation'],
    );
    expect(crumbsFor('/accounts/interbranch-reco').map((c) => c.label)).toEqual(
      ['Reconciliation', 'Statement Matching', 'Inter-Branch Reconciliation'],
    );
  });
});

describe('the Reconciliation pill carries the matching screens in every regime (getMenu)', () => {
  const reconPill = (branch) => {
    const menu = getMenu(branch, { role: 'Super Admin' });
    return allHrefs(menu.find((m) => m.label === 'Reconciliation'));
  };
  const GST = ['/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c', '/tax/reconciliation'];

  test.each([
    ['India branch (BOM)', { code: 'BOM' }],
    ['consolidated ("ALL")', 'ALL'],
    ['pure VAT branch (NBO)', { code: 'NBO' }],
  ])('%s: matching screens present, no tax links', (_name, branch) => {
    const h = reconPill(branch);
    GST.forEach((g) => expect(h).not.toContain(g));
    expect(h).toEqual(expect.arrayContaining(MATCHING));
  });

  test('Branch Accountant gets the pill WEEKLY-ONLY (their prep work; central tiers hidden)', () => {
    const menu = getMenu({ code: 'BOM' }, { role: 'Branch Accountant' });
    const h = allHrefs(menu.find((m) => m.label === 'Reconciliation'));
    expect(h).toEqual(expect.arrayContaining(['/bank-reco', '/reconciliation/hub/weekly', '/reconciliation/weekly', '/reconciliation/reports/weekly', '/reconciliation/rulebook']));
    ['/reconciliation/hub/monthly', '/reconciliation/hub/quarterly', '/reconciliation/hub/yearly',
      '/reconciliation/monthly', '/reconciliation/quarterly', '/reconciliation/yearly',
      '/reconciliation/reports/monthly', '/reconciliation/reports/quarterly', '/reconciliation/reports/yearly',
    ].forEach((hidden) => expect(h).not.toContain(hidden));
  });
});

describe('Taxation ▸ Reconciliation (GST, India regime) — unchanged', () => {
  function itemsUnderDivider(menu, dividerLabel) {
    const kids = menu.children;
    const start = kids.findIndex((c) => c.divider && c.label === dividerLabel);
    if (start < 0) return [];
    const out = [];
    for (let i = start + 1; i < kids.length; i++) {
      if (kids[i].divider) break;
      out.push(kids[i].href);
    }
    return out;
  }

  test('GST recon screens stay grouped under a Reconciliation divider', () => {
    expect(itemsUnderDivider(TAX_INDIA, 'Reconciliation')).toEqual(
      expect.arrayContaining(['/tax/gstr2b', '/tax/gstr2a', '/tax/gstr9c']),
    );
  });
});
