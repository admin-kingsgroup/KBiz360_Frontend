import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, FileUp, ShieldCheck, AlertTriangle, Stamp } from 'lucide-react';
import { getCertificate, freezeSnapshot, addAttachment, addException, resolveException, signCertificate, attachScan } from './api';
import { tierOf, statusMeta, sourceMeta, chainProgress, fmtAmt, openExceptions } from './utils';
import { Drawer, Badge, Button, Input, Select, FormField, LoadingState, EmptyState, ErrorState } from '../../shell/primitives';

// ─── Certificate Drawer — one ledger, one certificate ───────────────────────
// The working face of a Reconciliation Certificate: freeze the snapshot
// (Rule 02), attach hash-tied statements, raise/resolve exceptions (Rule 03),
// then walk the tier's signature chain. Physical tiers finish with the signed
// scan-back that locks the certificate (Rule 05). The backend re-checks every
// gate — this UI only ever offers what the server will accept.

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface-border py-2 text-sm last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-medium text-ink tabular-nums">{children}</span>
    </div>
  );
}

function SnapshotForm({ cert, onFreeze, busy, error }) {
  const [book, setBook] = useState('');
  const [stmt, setStmt] = useState('');
  const [adj, setAdj] = useState('0');
  // Round like the backend (2dp) so floating-point sums don't show a phantom difference.
  const diff = Math.round(((Number(stmt) || 0) + (Number(adj) || 0) - (Number(book) || 0)) * 100) / 100;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Balance per books" htmlFor="rc-book">
          <Input id="rc-book" type="number" value={book} onChange={(e) => setBook(e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="Balance per statement" htmlFor="rc-stmt">
          <Input id="rc-stmt" type="number" value={stmt} onChange={(e) => setStmt(e.target.value)} placeholder="0.00" />
        </FormField>
      </div>
      <FormField label="Reconciling items (net ±)" hint="Unpresented cheques, deposits in transit, charges to post — statement + adjustments must equal books.">
        <Input type="number" value={adj} onChange={(e) => setAdj(e.target.value)} />
      </FormField>
      <div className={`rounded-brand border px-3 py-2 text-sm font-semibold tabular-nums ${diff === 0 ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning'}`}>
        Difference after reconciling items: {fmtAmt(diff, cert.branch)} {diff === 0 ? '— ready to freeze' : '— must be zero to sign'}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button variant="primary" loading={busy} disabled={book === '' || stmt === ''} onClick={() => onFreeze({ bookBalance: Number(book), statementBalance: Number(stmt), adjustments: Number(adj) || 0 })}>
        Freeze snapshot (Rule 02)
      </Button>
    </div>
  );
}

export function CertificateDrawer({ id, branch, onClose }) {
  const qc = useQueryClient();
  const [attLabel, setAttLabel] = useState('');
  const [attSource, setAttSource] = useState('download');
  const [exText, setExText] = useState('');
  const [err, setErr] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['recon-certs', 'cert', id], queryFn: () => getCertificate(id), enabled: !!id });
  const cert = data?.data || data; // envelope unwrapped by the api client; /:id returns {data, chain, canSign}
  const canSign = data?.canSign;

  // Root invalidation — sign/scan changes ripple into the tree, summary,
  // pending board AND the Reports register; refresh them all.
  const invalidate = () => qc.invalidateQueries({ queryKey: ['recon-certs'] });
  // eslint-disable-next-line react-hooks/rules-of-hooks -- called unconditionally, fixed order
  const useAction = (fn) => useMutation({ mutationFn: fn, onSuccess: () => { setErr(''); invalidate(); }, onError: (e) => setErr(e.message) });
  const freeze = useAction((body) => freezeSnapshot(id, body));
  const attachM = useAction((body) => addAttachment(id, body));
  const exAdd = useAction((text) => addException(id, text));
  const exResolve = useAction((exId) => resolveException(id, exId));
  const signM = useAction(() => signCertificate(id));
  const scanM = useAction((fileName) => attachScan(id, fileName));

  if (!id) return null;
  const tier = cert ? tierOf(cert.tier) : null;
  const prog = cert ? chainProgress(cert) : null;
  const frozen = !!cert?.snapshot?.frozenAt;
  const signedFully = cert && prog.done >= prog.total;
  const meta = cert ? statusMeta(cert.status) : null;

  return (
    <Drawer open onClose={onClose} width="lg"
      title={cert ? cert.ledger.name : 'Certificate'}
      subtitle={cert ? `${cert.certNo} · ${tier.label}` : ''}
      footer={cert && (
        <div className="flex w-full items-center justify-between gap-3">
          <Badge tone={meta.tone} dot>{meta.label}</Badge>
          <div className="flex gap-2">
            {canSign?.ok && (
              <Button variant="primary" icon={Stamp} loading={signM.isPending} onClick={() => signM.mutate()}>
                Sign — {prog.next?.role} · {prog.next?.action}
              </Button>
            )}
            {tier?.mode === 'physical' && signedFully && cert.status !== 'locked' && openExceptions(cert) === 0 && (
              <Button variant="success" icon={ShieldCheck} loading={scanM.isPending} onClick={() => scanM.mutate('')}>
                Upload signed scan → Lock (Rule 05)
              </Button>
            )}
          </div>
        </div>
      )}>
      {isError ? (
        <ErrorState title="Couldn’t load this certificate" message="It may have been removed, or the reconciliation service didn’t respond." onRetry={() => refetch()} />
      ) : isLoading || !cert ? <LoadingState label="Loading certificate…" /> : (
        <div className="grid gap-5 p-4">

          {/* identity */}
          <section className="rounded-brand border border-surface-border bg-surface-alt/50 px-4 py-3">
            <Row label="Ledger">{cert.ledger.name} <span className="ml-1 font-mono text-xs text-ink-subtle">{cert.ledger.code}</span></Row>
            <Row label="Group">{cert.ledger.parentGroup} › {cert.ledger.subGroup}</Row>
            <Row label="Branch · Period">{cert.branch} · {cert.period}</Row>
            <Row label="Signature chain">{prog.done} / {prog.total}{prog.next ? ` · next: ${prog.next.role}` : ' · complete'}</Row>
          </section>

          {/* snapshot */}
          <section>
            <h3 className="kbiz-section-title mb-2">Snapshot — books vs statement</h3>
            {frozen ? (
              <div className="rounded-brand border border-surface-border px-4 py-2">
                <Row label="Balance per books">{fmtAmt(cert.snapshot.bookBalance, cert.branch)}</Row>
                <Row label="Balance per statement">{fmtAmt(cert.snapshot.statementBalance, cert.branch)}</Row>
                <Row label="Reconciling items (net)">{fmtAmt(cert.snapshot.adjustments, cert.branch)}</Row>
                <Row label="Difference">
                  <span className={Number(cert.snapshot.difference) === 0 ? 'text-success' : 'text-danger'}>{fmtAmt(cert.snapshot.difference, cert.branch)}</span>
                </Row>
                <p className="pt-2 text-xs text-ink-subtle">Frozen {new Date(cert.snapshot.frozenAt).toLocaleString()} by {cert.snapshot.frozenBy || '—'} — signatures attest to exactly these figures.</p>
              </div>
            ) : (
              <SnapshotForm cert={cert} onFreeze={(b) => freeze.mutate(b)} busy={freeze.isPending} error={err} />
            )}
          </section>

          {/* attachments */}
          <section>
            <h3 className="kbiz-section-title mb-2">Statements attached ({cert.attachments.length})</h3>
            {cert.attachments.length === 0 && <EmptyState title="No statement attached yet" hint="Attach the bank / supplier / portal statement this certificate reconciles against." />}
            <ul className="grid gap-2">
              {cert.attachments.map((a) => (
                <li key={a._id} className="flex items-center gap-3 rounded-brand border border-surface-border px-3 py-2 text-sm">
                  <Badge tone={sourceMeta(a.source).tone} size="sm">{sourceMeta(a.source).label}</Badge>
                  <span className="flex-1 truncate text-ink">{a.label}</span>
                  <span className="font-mono text-xs text-ink-subtle">#{a.hash}</span>
                </li>
              ))}
            </ul>
            {!signedFully && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <FormField label="Statement label" className="min-w-[220px] flex-1">
                  <Input value={attLabel} onChange={(e) => setAttLabel(e.target.value)} placeholder="e.g. ICICI statement — Jun 2026" />
                </FormField>
                <FormField label="Source">
                  <Select value={attSource} onChange={(e) => setAttSource(e.target.value)}>
                    <option value="download">Download (portal)</option>
                    <option value="physical">Physical (scan)</option>
                    <option value="feed">Bank feed</option>
                    <option value="internal">Internal</option>
                  </Select>
                </FormField>
                <Button icon={FileUp} loading={attachM.isPending} disabled={!attLabel.trim()} onClick={() => { attachM.mutate({ label: attLabel, source: attSource }); setAttLabel(''); }}>
                  Attach
                </Button>
              </div>
            )}
          </section>

          {/* exceptions */}
          <section>
            <h3 className="kbiz-section-title mb-2">Exceptions {openExceptions(cert) > 0 && <Badge tone="warning" size="sm" className="ml-1">{openExceptions(cert)} open — blocks signing</Badge>}</h3>
            <ul className="grid gap-2">
              {cert.exceptions.map((e) => (
                <li key={e._id} className="flex items-center gap-3 rounded-brand border border-surface-border px-3 py-2 text-sm">
                  {e.resolved
                    ? <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden="true" />
                    : <AlertTriangle size={16} className="shrink-0 text-warning" aria-hidden="true" />}
                  <span className={`flex-1 ${e.resolved ? 'text-ink-subtle line-through' : 'text-ink'}`}>{e.text}</span>
                  {!e.resolved && cert.status !== 'locked' && <Button size="xs" variant="ghost" loading={exResolve.isPending} onClick={() => exResolve.mutate(e._id)}>Resolve</Button>}
                </li>
              ))}
            </ul>
            {!signedFully && (
              <div className="mt-3 flex items-end gap-2">
                <FormField label="Raise an exception" className="flex-1">
                  <Input value={exText} onChange={(e) => setExText(e.target.value)} placeholder="e.g. 1 cheque unpresented beyond 90 days" />
                </FormField>
                <Button variant="secondary" loading={exAdd.isPending} disabled={!exText.trim()} onClick={() => { exAdd.mutate(exText); setExText(''); }}>Add</Button>
              </div>
            )}
          </section>

          {/* signature chain */}
          <section>
            <h3 className="kbiz-section-title mb-2">Signature chain — {tier.mode === 'digital' ? 'digital in ERP' : 'physical (wet-sign → scan back)'}</h3>
            <ol className="grid gap-2">
              {tier.chain.map((step, i) => {
                const sig = cert.signatures[i];
                const isNext = i === prog.done;
                return (
                  <li key={`${step.role}-${i}`} className={`flex items-center gap-3 rounded-brand border px-3 py-2 text-sm ${sig ? 'border-success/30 bg-success-soft/40' : isNext ? 'border-info/40 bg-info-soft/40' : 'border-surface-border'}`}>
                    {sig ? <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden="true" /> : <Circle size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />}
                    <span className="w-6 text-xs font-bold text-ink-subtle">{i + 1}</span>
                    <span className="flex-1 font-medium text-ink">{step.role} <span className="font-normal text-ink-muted">— {step.action}</span></span>
                    {sig
                      ? <span className="text-xs text-ink-subtle">{sig.by || '—'} · {new Date(sig.at).toLocaleDateString()}</span>
                      : isNext ? <Badge tone="info" size="sm">Next</Badge> : null}
                  </li>
                );
              })}
            </ol>
            {canSign && !canSign.ok && !signedFully && (
              <p className="mt-2 text-xs text-ink-subtle">You can’t sign right now: {canSign.reason}</p>
            )}
            {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
            {cert.status === 'locked' && (
              <p className="mt-2 rounded-brand bg-navy/5 px-3 py-2 text-xs font-semibold text-navy">
                Locked{cert.scanFileName ? ` · scan on file: ${cert.scanFileName}` : ''} — reopening requires a formal restatement (Rule 08).
              </p>
            )}
          </section>

        </div>
      )}
    </Drawer>
  );
}
