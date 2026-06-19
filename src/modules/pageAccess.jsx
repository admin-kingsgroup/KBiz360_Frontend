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
import { Eye, EyeOff, Search, Save, RotateCcw, Lock, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '../core/api';
import { useUsersAdmin } from '../core/useReference';
import { toast } from '../core/ux/toast';
import { buildPageCatalog, isPageAccessAdmin } from '../core/pageCatalog';
import { PageLayout } from '../shell/PageLayout';
import { PageSection, Button, StatusPill, Input, ResponsiveGrid, EmptyState } from '../shell/primitives';

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

export function PageAccessControl({ currentUser, setRoute }) {
  const usersLive = useUsersAdmin().data;
  const catalog = useMemo(() => buildPageCatalog(), []);
  const totalPages = useMemo(() => catalog.reduce((n, s) => n + s.items.length, 0), [catalog]);

  const [selId, setSelId] = useState(null);
  const [draft, setDraft] = useState(() => new Set());   // hidden keys (incl. any not in the catalogue, preserved)
  const [base, setBase] = useState(() => new Set());     // saved baseline → dirty detection
  const [userSearch, setUserSearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [collapsed, setCollapsed] = useState(() => new Set());

  const qc = useQueryClient();
  const saveMut = useMutation({
    mutationFn: ({ id, hidden }) => apiPut(`/api/auth/users/${id}/access`, { hidden }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ref', 'users'] }),
  });

  const users = usersLive || [];
  const selectedUser = users.find((u) => u.id === selId) || null;

  /* Load a user's saved deny-list into the editable draft. */
  const selectUser = (u) => {
    const h = new Set(Array.isArray(u.hidden) ? u.hidden : []);
    setSelId(u.id);
    setDraft(h);
    setBase(new Set(h));
    setPageSearch('');
  };

  // Keep the draft in sync if the underlying record changes while open and not dirty
  // (e.g. another admin saved). Never clobber unsaved edits.
  useEffect(() => {
    if (!selectedUser) return;
    const saved = new Set(Array.isArray(selectedUser.hidden) ? selectedUser.hidden : []);
    const dirty = saved.size !== base.size || [...saved].some((k) => !base.has(k));
    if (dirty && !isDirty) { setBase(saved); setDraft(new Set(saved)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const isDirty = useMemo(() => {
    if (draft.size !== base.size) return true;
    for (const k of draft) if (!base.has(k)) return true;
    return false;
  }, [draft, base]);

  const isVisible = (key) => !draft.has(key);
  const hiddenInCatalog = useMemo(
    () => catalog.reduce((n, s) => n + s.items.filter((i) => draft.has(i.key)).length, 0),
    [catalog, draft],
  );

  const setKeys = (keys, visible) => {
    setDraft((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => { if (visible) next.delete(k); else next.add(k); });
      return next;
    });
  };
  const toggleOne = (key) => setKeys([key], !isVisible(key));
  const setSection = (section, visible) => setKeys(section.items.map((i) => i.key), visible);
  const showAll = () => setKeys(catalog.flatMap((s) => s.items.map((i) => i.key)), true);
  const hideAll = () => setKeys(catalog.flatMap((s) => s.items.map((i) => i.key)), false);
  const resetDraft = () => setDraft(new Set(base));

  const toggleCollapse = (name) => setCollapsed((prev) => {
    const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next;
  });

  const save = () => {
    if (!selId) return;
    saveMut.mutate({ id: selId, hidden: [...draft] }, {
      onSuccess: () => { setBase(new Set(draft)); toast(`Saved — ${selectedUser?.name || 'user'} now sees ${totalPages - hiddenInCatalog} of ${totalPages} pages.`, 'success'); },
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
      subtitle="Choose which pages & reports each user can see. Toggle on = visible, off = hidden from that user's menu and direct links."
    >
      {/* ── Branded intro banner ── */}
      <div className="mb-4 flex items-start gap-2.5 rounded-brand bg-navy px-4 py-3.5 text-white tablet:px-5">
        <ShieldCheck size={22} className="mt-0.5 shrink-0 text-gold" />
        <p className="text-xs leading-relaxed text-[#aeb6d0]">
          Toggle <b className="text-[#27963c]">on</b> to make a page visible, or <b className="text-[#e58b8b]">off</b> to hide it from that user's
          menu and direct links. Dashboard is always available. Changes apply on the user's next sign-in (or within ~10 minutes).
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
              return (
                <button key={u.id} onClick={() => selectUser(u)}
                  className={`flex w-full items-center gap-2.5 border-b border-surface-alt px-3 py-2.5 text-left transition ${sel ? 'border-l-[3px] border-l-[#0070f2] bg-[#eef4ff]' : 'border-l-[3px] border-l-transparent bg-surface hover:bg-surface-alt'}`}>
                  <div className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${sel ? 'bg-[#0070f2] text-white' : 'bg-surface-alt text-ink-muted'}`}>
                    {(u.name || u.email || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold text-navy">{u.name || u.email}</div>
                    <div className="truncate text-[10px] text-ink-subtle">{u.role}{u.active === false ? ' · inactive' : ''}</div>
                  </div>
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
                    <div className="text-[11px] text-ink-muted">
                      {selectedUser.role} · sees <b className="text-[#27963c]">{totalPages - hiddenInCatalog}</b> of {totalPages} pages
                      {hiddenInCatalog > 0 && <> · <b className="text-maroon">{hiddenInCatalog} hidden</b></>}
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
                </div>
              </div>

              {/* Sections */}
              {visibleCatalog.length === 0 && (
                <PageSection><EmptyState icon={Search} title={`No pages match “${pageSearch}”.`} /></PageSection>
              )}
              {visibleCatalog.map((s) => {
                const isCollapsed = collapsed.has(s.section) && !q;
                const total = s.items.length;
                const hiddenN = s.items.filter((i) => draft.has(i.key)).length;
                return (
                  <div key={s.section} className="mb-2.5 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
                    <div className={`flex items-center gap-2 bg-surface-alt px-3.5 py-2.5 ${isCollapsed ? '' : 'border-b border-surface-border'}`}>
                      <button onClick={() => toggleCollapse(s.section)} disabled={!!q}
                        className={`flex flex-1 items-center gap-1.5 p-0 text-left ${q ? 'cursor-default' : 'cursor-pointer'}`}>
                        {!q && (isCollapsed ? <ChevronRight size={15} className="text-ink-muted" /> : <ChevronDown size={15} className="text-ink-muted" />)}
                        <span className="text-[12.5px] font-extrabold text-navy">{s.section}</span>
                        <span className={`text-[10px] font-bold ${hiddenN ? 'text-maroon' : 'text-[#27963c]'}`}>
                          {hiddenN ? `${total - hiddenN}/${total} visible` : `all ${total} visible`}
                        </span>
                      </button>
                      <Button size="xs" variant="secondary" onClick={() => setSection(s, true)}>Show all</Button>
                      <Button size="xs" variant="secondary" onClick={() => setSection(s, false)} className="text-maroon">Hide all</Button>
                    </div>
                    {!isCollapsed && (
                      <ResponsiveGrid min="300px" gap="none">
                        {s.items.map((it) => {
                          const on = isVisible(it.key);
                          return (
                            <label key={it.key} className="flex cursor-pointer items-center gap-2.5 border-b border-surface-alt px-3.5 py-2">
                              <Switch on={on} onChange={() => toggleOne(it.key)} />
                              <div className="min-w-0 flex-1">
                                <div className={`text-[12.5px] font-semibold ${on ? 'text-navy' : 'text-ink-subtle line-through'}`}>{it.label}</div>
                                <div className="truncate font-mono text-[10px] text-ink-subtle">{it.key}</div>
                              </div>
                            </label>
                          );
                        })}
                      </ResponsiveGrid>
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
