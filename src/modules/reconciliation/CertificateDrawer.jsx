import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, FileUp, ShieldCheck, AlertTriangle, Stamp, Lock, ExternalLink, SearchCheck } from 'lucide-react';
import { getCertificate, freezeSnapshot, addAttachment, addException, resolveException, signCertificate, attachScan, getAttachmentUrl, scrutinizeStatement } from './api';
import { parseStatementFile } from './statementParse';
import { ScrutinyView } from './ScrutinyView';
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

function SnapshotForm({ cert, books, onFreeze, busy, error }) {
  const [stmt, setStmt] = useState('');
  const [adj, setAdj] = useState('0');
  // Scrutiny hand-off: adopt the parsed statement closing + the classified
  // reconciling items as the snapshot figures — explicit, never silent.
  const scr = cert.scrutiny?.summary;
  const useScrutiny = () => {
    if (cert.scrutiny?.statementClosing != null) setStmt(String(cert.scrutiny.statementClosing));
    if (scr?.suggestedAdjustments != null) setAdj(String(scr.suggestedAdjustments));
  };
  // The BOOK side is auto-fetched from ERP Books and LOCKED — never typed.
  const book = books ? Number(books.amount) : null;
  // Round like the backend (2dp) so floating-point sums don't show a phantom difference.
  const diff = Math.round(((Number(stmt) || 0) + (Number(adj) || 0) - (book || 0)) * 100) / 100;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Balance per books" hint={books ? `Auto-fetched live from ERP Books as of ${books.asOf} — locked.` : undefined}>
          <div className="flex h-10 items-center gap-2 rounded-brand border border-surface-border bg-surface-alt px-3 text-sm font-semibold tabular-nums text-ink" aria-readonly="true">
            <Lock size={13} className="shrink-0 text-ink-subtle" aria-hidden="true" />
            {books ? fmtAmt(book, cert.branch) : <span className="font-normal text-ink-subtle">fetching from Books…</span>}
          </div>
        </FormField>
        <FormField label="Balance per statement" htmlFor="rc-stmt">
          <Input id="rc-stmt" type="number" value={stmt} onChange={(e) => setStmt(e.target.value)} placeholder="0.00" />
        </FormField>
      </div>
      <FormField label="Reconciling items (net ±)" hint="Unpresented cheques, deposits in transit, charges to post — statement + adjustments must equal books.">
        <Input type="number" value={adj} onChange={(e) => setAdj(e.target.value)} />
      </FormField>
      <div className={`rounded-brand border px-3 py-2 text-sm font-semibold tabular-nums ${diff === 0 && books ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning'}`}>
        Difference after reconciling items: {fmtAmt(diff, cert.branch)} {diff === 0 && books ? '— ready to freeze' : '— must be zero to sign'}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={busy} disabled={stmt === '' || !books} onClick={() => onFreeze({ statementBalance: Number(stmt), adjustments: Number(adj) || 0 })}>
          Freeze snapshot (Rule 02)
        </Button>
        {scr && (
          <Button variant="secondary" icon={SearchCheck} onClick={useScrutiny}
            disabled={scr.unresolved > 0}
            title={scr.unresolved > 0 ? `${scr.unresolved} scrutiny lines still need action` : undefined}>
            Use scrutiny figures{scr.unresolved > 0 ? ` (${scr.unresolved} unresolved)` : ''}
          </Button>
        )}
      </div>
    </div>
  );
}

export function CertificateDrawer({ id, branch, onClose }) {
  const qc = useQueryClient();
  const [attLabel, setAttLabel] = useState('');
  const [attSource, setAttSource] = useState('download');
  const [attFile, setAttFile] = useState(null);
  const [exText, setExText] = useState('');
  const [err, setErr] = useState('');
  const [parseNote, setParseNote] = useState('');
  const [showScrutiny, setShowScrutiny] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['recon-certs', 'cert', id], queryFn: () => getCertificate(id), enabled: !!id });
  const cert = data?.data || data; // envelope unwrapped by the api client; /:id returns {data, chain, canSign, books}
  const canSign = data?.canSign;
  const books = data?.books; // live ERP-Books closing balance (locked book side of the snapshot)

  // Root invalidation — sign/scan changes ripple into the tree, summary,
  // pending board AND the Reports register; refresh them all.
  const invalidate = () => qc.invalidateQueries({ queryKey: ['recon-certs'] });
  // eslint-disable-next-line react-hooks/rules-of-hooks -- called unconditionally, fixed order
  const useAction = (fn) => useMutation({ mutationFn: fn, onSuccess: () => { setErr(''); invalidate(); }, onError: (e) => setErr(e.message) });
  const freeze = useAction((body) => freezeSnapshot(id, body));
  // Attach = evidence upload + (when the file is HTML/TXT/CSV/Excel) client-side
  // parse → server-side entry-to-entry scrutiny in one step. PDF stays evidence.
  const attachM = useAction(async ({ label, source, file }) => {
    let parsed = null;
    if (file && /\.(csv|txt|xlsx?|xlsm|html?|htm)$/i.test(file.name)) parsed = await parseStatementFile(file);
    const res = await addAttachment(id, { label, source, file });
    if (parsed?.rows?.length) {
      const fresh = res?.data || res;
      const att = fresh?.attachments?.[(fresh.attachments?.length || 1) - 1];
      await scrutinizeStatement(id, {
        attachmentId: att?._id ? String(att._id) : '',
        fileName: file.name,
        rows: parsed.rows,
        statementClosing: parsed.statementClosing,
      });
      setParseNote(`Scrutinized ${parsed.rows.length} statement lines against the ledger.`);
    } else if (file && /\.pdf$/i.test(file.name)) {
      setParseNote('PDF stored as evidence — upload the HTML/TXT/Excel version for line-by-line scrutiny.');
    } else if (parsed?.error) {
      setParseNote(`Attached; line scrutiny skipped — ${parsed.error}`);
    } else {
      setParseNote('');
    }
    return res;
  });
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
                <Row label="Balance per books (auto-fetched, locked)">{fmtAmt(cert.snapshot.bookBalance, cert.branch)}</Row>
                <Row label="Balance per statement">{fmtAmt(cert.snapshot.statementBalance, cert.branch)}</Row>
                <Row label="Reconciling items (net)">{fmtAmt(cert.snapshot.adjustments, cert.branch)}</Row>
                <Row label="Difference">
                  <span className={Number(cert.snapshot.difference) === 0 ? 'text-success' : 'text-danger'}>{fmtAmt(cert.snapshot.difference, cert.branch)}</span>
                </Row>
                <p className="pt-2 text-xs text-ink-subtle">Frozen {new Date(cert.snapshot.frozenAt).toLocaleString()} by {cert.snapshot.frozenBy || '—'} — signatures attest to exactly these figures.</p>
              </div>
            ) : (
              <SnapshotForm cert={cert} books={books} onFreeze={(b) => freeze.mutate(b)} busy={freeze.isPending} error={err} />
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
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {a.label}
                    {a.fileName ? <span className="ml-2 text-xs text-ink-subtle">{a.fileName}{a.size ? ` · ${Math.max(1, Math.round(a.size / 1024))} KB` : ''}</span> : null}
                  </span>
                  {a.fileKey && (
                    <Button size="xs" variant="ghost" icon={ExternalLink}
                      onClick={async () => {
                        try { const r = await getAttachmentUrl(cert._id, a._id); if (r?.url) window.open(r.url, '_blank', 'noopener'); }
                        catch (e) { setErr(e.message); }
                      }}>
                      View
                    </Button>
                  )}
                  <span className="font-mono text-xs text-ink-subtle">#{a.hash}</span>
                </li>
              ))}
            </ul>
            {!signedFully && (
              <div className="mt-3 grid gap-2">
                <div className="flex flex-wrap items-end gap-2">
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
                  <Button icon={FileUp} loading={attachM.isPending} disabled={!attLabel.trim()}
                    onClick={() => { attachM.mutate({ label: attLabel, source: attSource, file: attFile }); setAttLabel(''); setAttFile(null); }}>
                    Attach
                  </Button>
                </div>
                <FormField label="Statement file — Excel · HTML · TXT · CSV parse line-by-line; PDF/image = evidence (optional)"
                  hint={attFile ? `${attFile.name} · ${Math.max(1, Math.round(attFile.size / 1024))} KB — stored, content-hashed${/\.(csv|txt|xlsx?|xlsm|html?|htm)$/i.test(attFile.name) ? ', and scrutinized entry-to-entry against the ledger' : ''}.` : 'Parseable statements are matched entry-to-entry against the ERP ledger on upload.'}>
                  <input
                    type="file"
                    accept=".pdf,.csv,.txt,.xml,.html,.htm,.xls,.xlsx,image/*,application/pdf,text/csv,text/plain,text/html,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => setAttFile(e.target.files?.[0] || null)}
                    className="block w-full cursor-pointer text-sm text-ink-muted file:mr-3 file:cursor-pointer file:rounded-brand file:border file:border-surface-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface-alt"
                  />
                </FormField>
                {parseNote ? <p className="text-xs text-ink-muted">{parseNote}</p> : null}
              </div>
            )}
          </section>

          {/* statement scrutiny */}
          {cert.scrutiny && (
            <section>
              <h3 className="kbiz-section-title mb-2">Statement Scrutiny — entry-to-entry</h3>
              <div className="flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface-alt/50 px-3 py-2.5">
                <Badge tone="success" size="sm" dot>{cert.scrutiny.summary?.matched ?? 0} matched</Badge>
                <Badge tone="warning" size="sm" dot>{cert.scrutiny.summary?.probable ?? 0} probable</Badge>
                <Badge tone="info" size="sm" dot>{cert.scrutiny.summary?.stmtOnly ?? 0} stmt-only</Badge>
                <Badge tone="danger" size="sm" dot>{cert.scrutiny.summary?.bookOnly ?? 0} book-only</Badge>
                {cert.scrutiny.summary?.unresolved > 0
                  ? <span className="text-xs font-semibold text-warning">{cert.scrutiny.summary.unresolved} need action</span>
                  : <span className="text-xs font-semibold text-success">every line matched or classified ✓</span>}
                <Button size="xs" variant="secondary" icon={SearchCheck} className="ml-auto" onClick={() => setShowScrutiny(true)}>
                  Open scrutiny report
                </Button>
              </div>
            </section>
          )}

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
      {showScrutiny && cert?.scrutiny && <ScrutinyView cert={cert} onClose={() => setShowScrutiny(false)} />}
    </Drawer>
  );
}
