/* ════════════════════════════════════════════════════════════════════
   MODULES/PAGE-ACCESS.JSX  —  Settings → Page Visibility Control

   The group admin (afshin.dhanani@kingsgroupco.com / Super Admin) picks a
   user and toggles which pages & reports that user can see. A toggle OFF
   adds the page's route to the user's `hidden` deny-list (stored on the
   BooksAccess record via PUT /api/auth/users/:id/access). getMenu() then
   strips those entries from the user's nav and App.jsx blocks them as
   direct routes. Changes take effect on the user's next sign-in (or within
   the ~10-minute token-refresh cycle).

   This is a UI-personalisation layer. The hard security gates — role
   permissions, branch scope, view-only — remain enforced server-side and
   are configured under Users & Roles, not here.

   UI: built on the shared responsive primitives (PageLayout, PageSection,
   Button, StatusPill, Input). Business logic is unchanged.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Search, Save, RotateCcw, Lock, ShieldCheck, ChevronDown, ChevronRight, Building2, KeyRound } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut, apiPost } from '../core/api';
import { useUsersAdmin } from '../core/useReference';
import { toast } from '../core/ux/toast';
import { buildPageCatalog, isPageAccessAdmin, roleVisibleKeys } from '../core/pageCatalog';
import { hasFullMenu } from '../core/menus';
import { BRANCHES } from '../core/referenceCache';
import { PageLayout } from '../shell/PageLayout';
import { PageSection, Button, StatusPill, Input, ResponsiveGrid, EmptyState } from '../shell/primitives';

// Roles that DEFAULT to all branches at login (mirrors auth.service resolveBranches
// ALL_SCOPE_ROLES on the backend). For these, an empty selection means "all branches";
// the admin can still narrow them to a specific subset with the toggles below.
const ALL_SCOPE_ROLES = new Set(['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive']);

// Every branch code shown in the toggles.
const branchCodesAll = () => BRANCHES.map((b) => b.code);
// Which branch toggles start ON for a user: the 'ALL' sentinel — or an empty list on an
// all-scope role — means every branch; a concrete stored list means exactly those.
function initialBranchSet(u) {
  const raw = u && u.branches;
  const arr = Array.isArray(raw) ? raw : (raw === 'ALL' ? ['ALL'] : []);
  const isAll = arr.includes('ALL') || (arr.length === 0 && ALL_SCOPE_ROLES.has(u && u.role));
  return new Set(isAll ? branchCodesAll() : arr);
}

const setsEqual = (a, b) => { if (a.size !== b.size) return false; for (const k of a) if (!b.has(k)) return false; return true; };

/* ── A small on/off switch. ON (green) = page is VISIBLE for the user. ── */
function Switch({ on, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={on}
      onClick={() => !disabled && onChange(!on)}
      title={on ? 'Visible — click to hide' : 'Hidden — click to show'}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-[#27963c]' : 'bg-[#c4c9d6]'} ${disabled ? 'cursor-default opacity-50' : 'cursor-pointer'}`}>
      <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-[left] ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

/* Group a section's pages by their sub-group (the nav sub-header, e.g. Dashboards ▸
   "Overview"), preserving menu order. Pages with no sub-group ('') collect under a
   single leading unnamed bucket so they render directly beneath the section header. */
function groupItems(items) {
  const order = [];
  const map = new Map();
  for (const it of items) {
    const name = it.group || '';
    if (!map.has(name)) { map.set(name, []); order.push(name); }
    map.get(name).push(it);
  }
  return order.map((name) => ({ name, items: map.get(name) }));
}

export function PageAccessControl({ currentUser, setRoute }) {
  const usersLive = useUsersAdmin().data;

  const [selId, setSelId] = useState(null);
  const [hiddenDraft, setHiddenDraft] = useState(() => new Set()); // in-role pages turned OFF (deny-list)
  const [hiddenBase, setHiddenBase] = useState(() => new Set());
  const [grantDraft, setGrantDraft] = useState(() => new Set());   // out-of-role pages turned ON (allow-list)
  const [grantBase, setGrantBase] = useState(() => new Set());
  const [userSearch, setUserSearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  // Start with EVERY section collapsed — the screen opens clean (just headers +
  // their visible-count), and only the section a user expands mounts its rows. This
  // keeps the DOM small (≈23 headers vs ≈270 toggle rows) so expand/collapse and
  // each toggle stay instant instead of re-rendering the whole wall on every click.
  const [collapsed, setCollapsed] = useState(() => new Set(buildPageCatalog().map((s) => s.section)));
  const [branchDraft, setBranchDraft] = useState(() => new Set()); // branch codes the user can access
  const [branchBase, setBranchBase] = useState(() => new Set());   // saved baseline → dirty detection

  const qc = useQueryClient();
  const saveMut = useMutation({
    // id is a Mongo _id for DB-backed users, or the email for bootstrap-map users
    // not yet persisted — encode it so the '@' rides safely in the URL path.
    mutationFn: (body) => apiPut(`/api/auth/users/${encodeURIComponent(body.id)}/access`, { hidden: body.hidden, granted: body.granted, branches: body.branches }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ref', 'users'] }),
  });

  const users = usersLive || [];
  const selectedUser = users.find((u) => u.id === selId) || null;

  // The FULL catalogue is shown for every user. Each row's default ON/OFF comes from
  // whether it is IN the selected user's role: in-role → ON (hiding it writes `hidden`),
  // out-of-role → OFF (turning it ON writes `granted`). So one list both restricts and grants.
  const catalog = useMemo(() => buildPageCatalog(), []);
  const totalPages = useMemo(() => catalog.reduce((n, s) => n + s.items.length, 0), [catalog]);
  const isFullUser = !!selectedUser && hasFullMenu(selectedUser);
  const roleSet = useMemo(
    () => (selectedUser ? roleVisibleKeys(selectedUser) : new Set()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedUser?.id, selectedUser?.role],
  );
  const inRole = (key) => isFullUser || roleSet.has(key);
  const isVisible = (key) => (grantDraft.has(key) ? true : inRole(key) && !hiddenDraft.has(key));

  /* Load a user's saved hidden + granted + branches into the editable drafts. */
  const selectUser = (u) => {
    const h = new Set(Array.isArray(u.hidden) ? u.hidden : []);
    const g = new Set(Array.isArray(u.granted) ? u.granted : []);
    const b = initialBranchSet(u);
    setSelId(u.id);
    setHiddenDraft(h); setHiddenBase(new Set(h));
    setGrantDraft(g); setGrantBase(new Set(g));
    setBranchDraft(b); setBranchBase(new Set(b));
    setPageSearch('');
    setResetOpen(false); setNewPwd(''); setConfirmPwd(''); setShowPwd(false);
  };

  // Keep drafts in sync if the underlying record changes while open and not dirty
  // (e.g. another admin saved). Never clobber unsaved edits.
  useEffect(() => {
    if (!selectedUser || isDirty) return;
    const sH = new Set(Array.isArray(selectedUser.hidden) ? selectedUser.hidden : []);
    const sG = new Set(Array.isArray(selectedUser.granted) ? selectedUser.granted : []);
    const sB = initialBranchSet(selectedUser);
    if (!setsEqual(sH, hiddenBase)) { setHiddenBase(sH); setHiddenDraft(new Set(sH)); }
    if (!setsEqual(sG, grantBase)) { setGrantBase(sG); setGrantDraft(new Set(sG)); }
    if (!setsEqual(sB, branchBase)) { setBranchBase(sB); setBranchDraft(new Set(sB)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const isDirty = useMemo(
    () => !setsEqual(hiddenDraft, hiddenBase) || !setsEqual(grantDraft, grantBase) || !setsEqual(branchDraft, branchBase),
    [hiddenDraft, hiddenBase, grantDraft, grantBase, branchDraft, branchBase],
  );

  const counts = useMemo(() => {
    let visible = 0, hidden = 0, granted = 0;
    for (const s of catalog) for (const i of s.items) {
      if (isVisible(i.key)) visible++;
      if (inRole(i.key) && hiddenDraft.has(i.key)) hidden++;
      if (!inRole(i.key) && grantDraft.has(i.key)) granted++;
    }
    return { visible, hidden, granted };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, hiddenDraft, grantDraft, roleSet, isFullUser]);

  // Set a batch of keys visible/hidden. An in-role key writes the deny-list (`hidden`);
  // an out-of-role key writes the allow-list (`granted`).
  const setKeys = (keys, visible) => {
    setHiddenDraft((prev) => { const h = new Set(prev); keys.forEach((k) => { if (inRole(k)) { visible ? h.delete(k) : h.add(k); } }); return h; });
    setGrantDraft((prev) => { const g = new Set(prev); keys.forEach((k) => { if (!inRole(k)) { visible ? g.add(k) : g.delete(k); } }); return g; });
  };
  const toggleOne = (key) => setKeys([key], !isVisible(key));
  const setSection = (section, visible) => setKeys(section.items.map((i) => i.key), visible);
  const showAll = () => setKeys(catalog.flatMap((s) => s.items.map((i) => i.key)), true);
  const hideAll = () => setKeys(catalog.flatMap((s) => s.items.map((i) => i.key)), false);
  const resetDraft = () => { setHiddenDraft(new Set(hiddenBase)); setGrantDraft(new Set(grantBase)); setBranchDraft(new Set(branchBase)); };

  // Branch access is editable for EVERY user. All-scope roles merely DEFAULT to all
  // branches (see initialBranchSet); the admin can narrow them to a subset here, and an
  // empty selection on such a role falls back to all branches server-side.
  const allBranchCodes = branchCodesAll();
  const allSelected = allBranchCodes.length > 0 && allBranchCodes.every((c) => branchDraft.has(c));
  const isAllScopeDefault = !!selectedUser && ALL_SCOPE_ROLES.has(selectedUser.role);
  const toggleBranch = (code) => {
    setBranchDraft((prev) => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; });
  };
  const setAllBranches = (on) => setBranchDraft(() => new Set(on ? allBranchCodes : []));

  const toggleCollapse = (name) => setCollapsed((prev) => {
    const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next;
  });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(catalog.map((s) => s.section)));

  // ── Admin password reset (afshin sets a new password for the selected user) ──
  const [resetOpen, setResetOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const resetMut = useMutation({
    mutationFn: ({ email, newPassword }) => apiPost('/api/auth/admin/reset-password', { email, newPassword }),
  });
  const closeReset = () => { setResetOpen(false); setNewPwd(''); setConfirmPwd(''); setShowPwd(false); };
  const doReset = () => {
    if (!selectedUser?.email) return;
    if (newPwd.length < 8) { toast('New password must be at least 8 characters', 'error'); return; }
    if (newPwd !== confirmPwd) { toast('Passwords do not match', 'error'); return; }
    resetMut.mutate({ email: selectedUser.email, newPassword: newPwd }, {
      onSuccess: () => { toast(`Password reset for ${selectedUser.name || selectedUser.email}. Share it securely — it can't be shown again.`, 'success'); closeReset(); },
      onError: (e) => toast(e?.message || 'Could not reset password (does this user have a login account?)', 'error'),
    });
  };

  const save = () => {
    if (!selId) return;
    // Send the 'ALL' sentinel when every branch is on, so the user keeps expanding to the
    // live branch list; otherwise persist the exact subset the admin picked.
    const branchesPayload = allSelected ? ['ALL'] : [...branchDraft];
    saveMut.mutate({ id: selId, hidden: [...hiddenDraft], granted: [...grantDraft], branches: branchesPayload }, {
      onSuccess: () => {
        setHiddenBase(new Set(hiddenDraft));
        setGrantBase(new Set(grantDraft));
        setBranchBase(new Set(branchDraft));
        const scope = allSelected ? 'all branches'
          : branchDraft.size === 0 ? (isAllScopeDefault ? 'all branches (role default)' : 'no branches')
          : `${branchDraft.size} branch${branchDraft.size === 1 ? '' : 'es'}`;
        toast(`Saved — ${selectedUser?.name || 'user'} sees ${counts.visible} of ${totalPages} pages · ${scope}.`, 'success');
      },
      onError: (e) => toast(e?.message || 'Could not save. Try again.', 'error'),
    });
  };

  /* ── Filtered catalogue for the page-search box. ── */
  const q = pageSearch.trim().toLowerCase();
  const visibleCatalog = useMemo(() => {
    if (!q) return catalog;
    return catalog
      .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)) }))
      .filter((s) => s.items.length);
  }, [catalog, q]);

  /* ── Access gate: only the visibility administrator opens this page. All hooks
       above run unconditionally (Rules of Hooks); the gate is checked after. ── */
  if (!isPageAccessAdmin(currentUser)) {
    return (
      <PageLayout title="Page Visibility Control">
        <PageSection className="mx-auto max-w-xl">
          <EmptyState
            icon={Lock}
            title="Restricted"
            hint="Only afshin.dhanani@kingsgroupco.com (or a Super Admin) can manage page visibility."
            action={<Button variant="primary" onClick={() => setRoute && setRoute('/dashboard')}>← Back to Dashboard</Button>}
          />
        </PageSection>
      </PageLayout>
    );
  }

  const filteredUsers = users.filter((u) => {
    const t = userSearch.trim().toLowerCase();
    return !t || (u.name || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t);
  });

  return (
    <PageLayout
      title="Page Visibility Control"
      subtitle="Choose which branches and which pages & reports each user can see. Toggle on = visible, off = hidden from that user's menu and direct links."
    >
      {/* ── Branded intro banner ── */}
      <div className="mb-4 flex items-start gap-2.5 rounded-brand bg-navy px-4 py-3.5 text-white tablet:px-5">
        <ShieldCheck size={22} className="mt-0.5 shrink-0 text-gold" />
        <p className="text-xs leading-relaxed text-[#aeb6d0]">
          Toggle <b className="text-[#27963c]">on</b> to make a page visible, or <b className="text-[#e58b8b]">off</b> to hide it from that user's
          menu and direct links. Pages outside the user's role start <b className="text-[#e58b8b]">off</b> — switch one <b className="text-[#27963c]">on</b> to
          <b className="text-white"> grant</b> it (it then shows in their menu and opens by direct link). Dashboard is always available. Changes apply on the user's next sign-in (or within ~10 minutes).
        </p>
      </div>

      <div className="flex flex-col items-start gap-3.5 desktop:flex-row">
        {/* ── Left: user picker ── */}
        <PageSection padded={false} className="w-full shrink-0 overflow-hidden desktop:w-[290px]">
          <div className="border-b border-surface-border p-3">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">Users ({users.length})</p>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
              <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users…" className="pl-8" />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto desktop:max-h-[560px]">
            {!usersLive && <div className="p-4 text-xs text-ink-subtle">Loading users…</div>}
            {usersLive && !filteredUsers.length && <div className="p-4 text-xs text-ink-subtle">No users match.</div>}
            {filteredUsers.map((u) => {
              const sel = u.id === selId;
              const nHidden = (Array.isArray(u.hidden) ? u.hidden : []).filter((k) => k !== '/dashboard' && k !== '/settings/page-access').length;
              const nGranted = (Array.isArray(u.granted) ? u.granted : []).length;
              return (
                <button key={u.id} onClick={() => selectUser(u)}
                  className={`flex w-full items-center gap-2.5 border-b border-surface-alt px-3 py-2.5 text-left transition ${sel ? 'border-l-[3px] border-l-[#0070f2] bg-[#eef4ff]' : 'border-l-[3px] border-l-transparent bg-surface hover:bg-surface-alt'}`}>
                  <div className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${sel ? 'bg-[#0070f2] text-white' : 'bg-surface-alt text-ink-muted'}`}>
                    {(u.name || u.email || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold text-navy">{u.name || u.email}</div>
                    <div className="truncate font-mono text-[10.5px] text-ink-muted">{u.email}</div>
                    <div className="truncate text-[10px] text-ink-subtle">{u.role}{u.active === false ? ' · inactive' : ''}</div>
                  </div>
                  {nGranted > 0 && <StatusPill tone="info" size="sm">{nGranted} granted</StatusPill>}
                  {nHidden > 0 && <StatusPill tone="danger" size="sm">{nHidden} hidden</StatusPill>}
                </button>
              );
            })}
          </div>
        </PageSection>

        {/* ── Right: catalogue of pages/reports ── */}
        <div className="w-full min-w-0 flex-1">
          {!selectedUser ? (
            <PageSection>
              <EmptyState icon={Eye} title="Select a user on the left to manage what they can see." />
            </PageSection>
          ) : (
            <>
              {/* Sticky action bar */}
              <div className="sticky top-0 z-[5] mb-3 rounded-brand border border-surface-border bg-surface p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-extrabold text-navy">{selectedUser.name || selectedUser.email}</div>
                    <div className="select-all truncate font-mono text-[11px] text-ink-muted">{selectedUser.email}</div>
                    <div className="text-[11px] text-ink-muted">
                      {selectedUser.role} · sees <b className="text-[#27963c]">{counts.visible}</b> of {totalPages} pages
                      {counts.hidden > 0 && <> · <b className="text-maroon">{counts.hidden} hidden</b></>}
                      {counts.granted > 0 && <> · <b className="text-[#0070f2]">{counts.granted} granted</b></>}
                    </div>
                  </div>
                  <div className="relative flex-[1_1_100%] tablet:flex-[0_0_200px]">
                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
                    <Input value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} placeholder="Filter pages…" className="pl-8" />
                  </div>
                  <Button size="sm" variant="secondary" icon={Eye} onClick={showAll}>Show all</Button>
                  <Button size="sm" variant="secondary" icon={EyeOff} onClick={hideAll} className="text-maroon">Hide all</Button>
                  <Button size="sm" variant="secondary" icon={RotateCcw} onClick={resetDraft} disabled={!isDirty}>Reset</Button>
                  <Button size="sm" variant="primary" icon={Save} onClick={save} loading={saveMut.isPending} disabled={!isDirty || saveMut.isPending}>
                    {saveMut.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => (resetOpen ? closeReset() : setResetOpen(true))}>
                    Reset password
                  </Button>
                </div>
              </div>

              {/* Admin password reset — set a NEW password for this user (shared CRM login). */}
              {resetOpen && (
                <div className="mb-2.5 overflow-hidden rounded-brand border border-[#c7d6f2] bg-[#f5f8ff] shadow-sm">
                  <div className="flex items-center gap-2 border-b border-[#c7d6f2] bg-[#eaf1ff] px-3.5 py-2.5">
                    <KeyRound size={15} className="text-[#0070f2]" />
                    <span className="flex-1 text-[12.5px] font-extrabold text-navy">Reset password — {selectedUser.name || selectedUser.email}</span>
                  </div>
                  <div className="p-3.5">
                    <p className="mb-3 text-[11px] leading-relaxed text-ink-muted">
                      Sets a brand-new password for <b>{selectedUser.email}</b>. Passwords are stored encrypted and can never be viewed — so note this one and share it securely; the user should change it after signing in. <b>This is their shared login — it also changes their CRM password.</b>
                    </p>
                    <div className="flex flex-wrap items-end gap-2.5">
                      <label className="flex-1 min-w-[160px]">
                        <span className="mb-1 block text-[11px] font-bold text-ink-muted">New password</span>
                        <Input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                      </label>
                      <label className="flex-1 min-w-[160px]">
                        <span className="mb-1 block text-[11px] font-bold text-ink-muted">Confirm password</span>
                        <Input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" />
                      </label>
                      <Button size="sm" variant="secondary" onClick={closeReset} disabled={resetMut.isPending}>Cancel</Button>
                      <Button size="sm" variant="primary" icon={KeyRound} onClick={doReset} loading={resetMut.isPending} disabled={resetMut.isPending}>
                        {resetMut.isPending ? 'Resetting…' : 'Set password'}
                      </Button>
                    </div>
                    <label className="mt-2.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-muted">
                      <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} /> Show passwords
                    </label>
                  </div>
                </div>
              )}

              {/* Branch access — which branches this user is scoped to */}
              <div className="mb-2.5 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
                <div className="flex items-center gap-2 border-b border-surface-border bg-surface-alt px-3.5 py-2.5">
                  <Building2 size={15} className="text-ink-muted" />
                  <span className="flex-1 text-[12.5px] font-extrabold text-navy">Branch access</span>
                  <button type="button" onClick={() => setAllBranches(!allSelected)}
                    className="rounded border border-surface-border px-2 py-0.5 text-[10px] font-bold text-ink-muted transition hover:border-[#0070f2] hover:text-[#0070f2]">
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                  <span className={`text-[10px] font-bold ${branchDraft.size ? 'text-[#27963c]' : 'text-maroon'}`}>
                    {allSelected ? `all ${BRANCHES.length} branches` : `${branchDraft.size} of ${BRANCHES.length} branches`}
                  </span>
                </div>
                <ResponsiveGrid min="220px" gap="none">
                  {BRANCHES.map((b) => {
                    const on = branchDraft.has(b.code);
                    return (
                      <label key={b.code} className="flex cursor-pointer items-center gap-2.5 border-b border-surface-alt px-3.5 py-2">
                        <Switch on={on} onChange={() => toggleBranch(b.code)} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-[12.5px] font-semibold ${on ? 'text-navy' : 'text-ink-subtle'}`}>
                            <span className="mr-1">{b.flag}</span>{b.code}
                          </div>
                          <div className="truncate text-[10px] text-ink-subtle">{b.city}{b.country ? `, ${b.country}` : ''}</div>
                        </div>
                      </label>
                    );
                  })}
                </ResponsiveGrid>
                {branchDraft.size === 0 ? (
                  <div className="bg-surface-alt/60 px-3.5 py-2 text-[11px] text-maroon">
                    {isAllScopeDefault
                      ? <><b>{selectedUser.role}</b> falls back to <b>all branches</b> when none are ticked. Tick a subset to restrict this user to specific branches.</>
                      : <>No branches selected — this user can't load any branch-scoped data until at least one is enabled.</>}
                  </div>
                ) : allSelected ? (
                  <div className="bg-surface-alt/60 px-3.5 py-2 text-[11px] text-ink-muted">
                    All branches enabled{isAllScopeDefault ? ' (role default)' : ''}. Turn some off to restrict this user to a subset.
                  </div>
                ) : (
                  <div className="bg-surface-alt/60 px-3.5 py-2 text-[11px] text-ink-muted">
                    Restricted to <b>{branchDraft.size}</b> branch{branchDraft.size === 1 ? '' : 'es'} — this user will see only these branches' data.
                  </div>
                )}
              </div>

              {/* Sections */}
              {visibleCatalog.length === 0 && (
                <PageSection><EmptyState icon={Search} title={`No pages match “${pageSearch}”.`} /></PageSection>
              )}
              {/* Expand / collapse all — sections start collapsed for a clean, fast page. */}
              {visibleCatalog.length > 0 && !q && (
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[11px] text-ink-subtle">{visibleCatalog.length} sections · click a header to expand</span>
                  <span className="flex items-center gap-2">
                    <button onClick={expandAll} className="text-[11px] font-semibold text-ink-muted hover:text-navy">Expand all</button>
                    <span className="text-ink-subtle/40">·</span>
                    <button onClick={collapseAll} className="text-[11px] font-semibold text-ink-muted hover:text-navy">Collapse all</button>
                  </span>
                </div>
              )}
              {visibleCatalog.map((s) => {
                const isCollapsed = collapsed.has(s.section) && !q;
                const total = s.items.length;
                const visN = s.items.filter((i) => isVisible(i.key)).length;
                return (
                  <div key={s.section} className="mb-2.5 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
                    <div className={`flex items-center gap-2 bg-surface-alt px-3.5 py-2.5 ${isCollapsed ? '' : 'border-b border-surface-border'}`}>
                      <button onClick={() => toggleCollapse(s.section)} disabled={!!q}
                        className={`flex flex-1 items-center gap-1.5 p-0 text-left ${q ? 'cursor-default' : 'cursor-pointer'}`}>
                        {!q && (isCollapsed ? <ChevronRight size={15} className="text-ink-muted" /> : <ChevronDown size={15} className="text-ink-muted" />)}
                        <span className="text-[12.5px] font-extrabold text-navy">{s.section}</span>
                        <span className={`text-[10px] font-bold ${visN < total ? 'text-maroon' : 'text-[#27963c]'}`}>
                          {visN < total ? `${visN}/${total} visible` : `all ${total} visible`}
                        </span>
                      </button>
                      <Button size="xs" variant="secondary" onClick={() => setSection(s, true)}>Show all</Button>
                      <Button size="xs" variant="secondary" onClick={() => setSection(s, false)} className="text-maroon">Hide all</Button>
                    </div>
                    {!isCollapsed && (
                      <div>
                        {groupItems(s.items).map((grp) => (
                          <div key={grp.name || '__nogroup'}>
                            {/* Sub-header (nav sub-group) with its own All / None shortcut. */}
                            {grp.name && (
                              <div className="flex items-center justify-between gap-2 border-b border-surface-alt bg-surface-alt/50 px-3.5 py-1.5">
                                <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">{grp.name}</span>
                                <span className="flex items-center gap-1.5">
                                  <button onClick={() => setKeys(grp.items.map((i) => i.key), true)}
                                    className="text-[10px] font-semibold text-ink-subtle hover:text-[#27963c]">All</button>
                                  <span className="text-ink-subtle/40">·</span>
                                  <button onClick={() => setKeys(grp.items.map((i) => i.key), false)}
                                    className="text-[10px] font-semibold text-ink-subtle hover:text-maroon">None</button>
                                </span>
                              </div>
                            )}
                            {grp.items.map((it) => {
                              const on = isVisible(it.key);
                              const extra = !inRole(it.key); // out-of-role → turning ON grants it
                              return (
                                <label key={it.key}
                                  className={`flex cursor-pointer items-center gap-2.5 border-b border-surface-alt py-2 ${grp.name ? 'pl-6 pr-3.5' : 'px-3.5'}`}>
                                  <Switch on={on} onChange={() => toggleOne(it.key)} />
                                  <div className="min-w-0 flex-1">
                                    <div className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${on ? 'text-navy' : 'text-ink-subtle line-through'}`}>
                                      <span className="truncate">{it.label}</span>
                                      {extra && on && <StatusPill tone="info" size="sm">granted</StatusPill>}
                                      {extra && !on && <span className="text-[9px] font-bold uppercase tracking-wide text-ink-subtle">not in role</span>}
                                    </div>
                                    <div className="truncate font-mono text-[10px] text-ink-subtle">{it.key}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
