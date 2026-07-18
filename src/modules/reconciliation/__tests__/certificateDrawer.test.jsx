// CertificateDrawer · branch-action gating for the Month-tier split.
// A Branch Accountant may freeze a MONTH statement ledger (bank/client/supplier)
// at the branch, but NOT the month's other heads (tax/loans/capital/assets) — and
// never the scan-back that locks the period. The drawer must DISABLE-WITH-REASON
// (house rule), not offer buttons the server 403s. It must also render the chain
// the SERVER sent (data.chain), so a month bank cert shows the branch-freeze step.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const base = {
  branch: 'BOM', tier: 'month', period: '2026-06', status: 'reconciled',
  signatures: [], exceptions: [], attachments: [], snapshot: { frozenAt: null },
};
const bankCert = { ...base, _id: 'm1', certNo: 'ME/BOM/2026-06/B1', ledger: { name: 'ICICI Bank A/c', code: 'B1', parentGroup: 'Current Assets', subGroup: 'Bank Accounts' } };
const capitalCert = { ...base, _id: 'm2', certNo: 'ME/BOM/2026-06/CAP', ledger: { name: 'Share Capital', code: 'CAP', parentGroup: 'Capital Account', subGroup: 'Capital Account' } };
const MONTH_STATEMENT = [{ role: 'Branch Accountant', action: 'Prepared' }, { role: 'AE', action: 'Verified' }, { role: 'FM', action: 'Verified' }, { role: 'Director', action: 'Certified' }, { role: 'Owner', action: 'Locked' }];
const MONTH_DEFAULT = [{ role: 'AE', action: 'Prepared' }, { role: 'FM', action: 'Verified' }, { role: 'Director', action: 'Certified' }, { role: 'Owner', action: 'Locked' }];

jest.mock('../api', () => ({
  getCertificate: jest.fn(),
  freezeSnapshot: jest.fn(), addAttachment: jest.fn(), addException: jest.fn(), resolveException: jest.fn(),
  signCertificate: jest.fn(), attachScan: jest.fn(), getAttachmentUrl: jest.fn(), scrutinizeStatement: jest.fn(),
}));
import { getCertificate } from '../api';
import { CertificateDrawer } from '../shared/CertificateDrawer';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};
const resolveCert = (cert, chain) => getCertificate.mockResolvedValue({ data: cert, chain, canSign: { ok: false, reason: 'not your step' }, books: { amount: 100, asOf: '2026-06-30' } });

describe('CertificateDrawer · month-split branch gating', () => {
  test('BA on a NON-statement month head (capital): "view only" reason shown + Freeze disabled', async () => {
    resolveCert(capitalCert, MONTH_DEFAULT);
    wrap(<CertificateDrawer id="m2" branch="BOM" currentUser={{ role: 'Branch Accountant' }} onClose={() => {}} setRoute={() => {}} />);
    expect(await screen.findByText(/View only for the branch here/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Freeze snapshot/i })).toBeDisabled();
  });

  test('BA on a month STATEMENT ledger (bank): NOT blocked, and the chain shows the branch-freeze step', async () => {
    resolveCert(bankCert, MONTH_STATEMENT);
    wrap(<CertificateDrawer id="m1" branch="BOM" currentUser={{ role: 'Branch Accountant' }} onClose={() => {}} setRoute={() => {}} />);
    expect(await screen.findByText('Snapshot — books vs statement')).toBeInTheDocument(); // drawer rendered
    expect(screen.queryByText(/View only for the branch here/i)).not.toBeInTheDocument();
    // The server-sent 5-step chain renders (Branch Accountant is the first signer).
    expect(screen.getAllByText(/Branch Accountant/).length).toBeGreaterThan(0);
    // Freeze available for a statement head (disabled only by the empty statement field, not a block).
    expect(screen.queryByRole('button', { name: /Freeze snapshot/i })).toBeInTheDocument();
  });

  test('a CENTRAL role (Director) is never branch-blocked, even on a non-statement head', async () => {
    resolveCert(capitalCert, MONTH_DEFAULT);
    wrap(<CertificateDrawer id="m2" branch="BOM" currentUser={{ role: 'Director' }} onClose={() => {}} setRoute={() => {}} />);
    expect(await screen.findByText('Snapshot — books vs statement')).toBeInTheDocument(); // drawer rendered
    expect(screen.queryByText(/View only for the branch here/i)).not.toBeInTheDocument();
  });
});
