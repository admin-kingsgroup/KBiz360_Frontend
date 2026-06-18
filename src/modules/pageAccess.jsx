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
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Search, Save, RotateCcw, Lock, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPut } from '../core/api';
import { useUsersAdmin } from '../core/useReference';
import { toast } from '../core/ux/toast';
import { buildPageCatalog, isPageAccessAdmin } from '../core/pageCatalog';
import { useMobile } from '../core/hooks';
import { card, btnG, btnGh, inp } from '../core/styles';

const DARK = '#0d1326', GOLD = '#d4a437', GREEN = '#27963c', GREY = '#c4c9d6';

/* ── A small on/off switch. ON (green) = page is VISIBLE for the user. ── */
function Switch({ on, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={on}
      onClick={() => !disabled && onChange(!on)}
      title={on ? 'Visible — click to hide' : 'Hidden — click to show'}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none',
        cursor: disabled ? 'default' : 'pointer', background: on ? GREEN : GREY,
        position: 'relative', transition: 'background .15s', flexShrink: 0, opacity: disabled ? 0.5 : 1,
      }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export function PageAccessControl({ currentUser, setRoute }) {
  const mob = useMobile();

  /* ── Access gate: only the visibility administrator opens this page. ── */
  if (!isPageAccessAdmin(currentUser)) {
    return (
      <div style={{ padding: 30, maxWidth: 560, margin: '40px auto', background: '#fff', borderRadius: 10, border: '1px solid #e1e3ec', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 14 }}><Lock size={40} color="#A32D2D" /></div>
        <h2 style={{ margin: '0 0 8px', color: DARK, fontSize: 20 }}>Restricted</h2>
        <p style={{ margin: '0 0 20px', color: '#5a6691', fontSize: 13.5, lineHeight: 1.5 }}>
          Only <b>afshin.dhanani@kingsgroupco.com</b> (or a Super Admin) can manage page visibility.
        </p>
        <button onClick={() => setRoute && setRoute('/dashboard')}
          style={{ ...btnG, padding: '10px 22px' }}>← Back to Dashboard</button>
      </div>
    );
  }

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

  const filteredUsers = users.filter((u) => {
    const t = userSearch.trim().toLowerCase();
    return !t || (u.name || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t);
  });

  return (
    <div style={{ padding: mob ? 10 : 16, maxWidth: 1240, margin: '0 auto' }}>
      {/* ── Banner ── */}
      <div style={{ background: DARK, borderRadius: 12, padding: mob ? '14px 16px' : '18px 22px', marginBottom: 14, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} color={GOLD} />
          <div>
            <h1 style={{ margin: 0, fontSize: mob ? 17 : 20, fontWeight: 800, color: '#fff' }}>Page Visibility Control</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#aeb6d0', lineHeight: 1.5 }}>
              Choose which pages &amp; reports each user can see. Toggle <b style={{ color: GREEN }}>on</b> = visible,
              toggle <b style={{ color: '#e58b8b' }}>off</b> = hidden from that user's menu and direct links.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: 14, alignItems: 'flex-start' }}>
        {/* ── Left: user picker ── */}
        <div style={{ ...card, padding: 0, width: mob ? '100%' : 290, flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #eef0f6' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.4px', color: '#5a6691', textTransform: 'uppercase' }}>Users ({users.length})</p>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#8b94b3' }} />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users…"
                style={{ ...inp, paddingLeft: 28, minHeight: 32, fontSize: 11.5 }} />
            </div>
          </div>
          <div style={{ maxHeight: mob ? 240 : 560, overflowY: 'auto' }}>
            {!usersLive && <div style={{ padding: 16, fontSize: 12, color: '#8b94b3' }}>Loading users…</div>}
            {usersLive && !filteredUsers.length && <div style={{ padding: 16, fontSize: 12, color: '#8b94b3' }}>No users match.</div>}
            {filteredUsers.map((u) => {
              const sel = u.id === selId;
              const nHidden = (Array.isArray(u.hidden) ? u.hidden : []).filter((k) => k !== '/dashboard' && k !== '/settings/page-access').length;
              return (
                <button key={u.id} onClick={() => selectUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                    padding: '9px 12px', border: 'none', borderBottom: '1px solid #f3f4f8', cursor: 'pointer',
                    background: sel ? '#eef4ff' : '#fff',
                    borderLeft: sel ? '3px solid #0070f2' : '3px solid transparent',
                  }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: sel ? '#0070f2' : '#f0f2f8', color: sel ? '#fff' : '#5a6691', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {(u.name || u.email || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || u.email}</div>
                    <div style={{ fontSize: 10, color: '#8b94b3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.role}{u.active === false ? ' · inactive' : ''}</div>
                  </div>
                  {nHidden > 0 && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: '#FBE9E9', color: '#A32D2D', flexShrink: 0 }}>{nHidden} hidden</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: catalogue of pages/reports ── */}
        <div style={{ flex: 1, minWidth: 0, width: mob ? '100%' : 'auto' }}>
          {!selectedUser ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#8b94b3' }}>
              <Eye size={34} style={{ opacity: 0.5 }} />
              <p style={{ margin: '12px 0 0', fontSize: 13.5, fontWeight: 600 }}>Select a user on the left to manage what they can see.</p>
            </div>
          ) : (
            <>
              {/* Sticky action bar */}
              <div style={{ ...card, padding: 12, marginBottom: 12, position: 'sticky', top: 0, zIndex: 5 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: DARK }}>{selectedUser.name || selectedUser.email}</div>
                    <div style={{ fontSize: 11, color: '#5a6691' }}>
                      {selectedUser.role} · sees <b style={{ color: GREEN }}>{totalPages - hiddenInCatalog}</b> of {totalPages} pages
                      {hiddenInCatalog > 0 && <> · <b style={{ color: '#A32D2D' }}>{hiddenInCatalog} hidden</b></>}
                    </div>
                  </div>
                  <div style={{ position: 'relative', flex: mob ? '1 1 100%' : '0 0 200px' }}>
                    <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#8b94b3' }} />
                    <input value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} placeholder="Filter pages…"
                      style={{ ...inp, paddingLeft: 28, minHeight: 32, fontSize: 11.5 }} />
                  </div>
                  <button onClick={showAll} style={{ ...btnGh, fontSize: 11, padding: '6px 10px' }}><Eye size={13} /> Show all</button>
                  <button onClick={hideAll} style={{ ...btnGh, fontSize: 11, padding: '6px 10px', color: '#A32D2D' }}><EyeOff size={13} /> Hide all</button>
                  <button onClick={resetDraft} disabled={!isDirty} style={{ ...btnGh, fontSize: 11, padding: '6px 10px', opacity: isDirty ? 1 : 0.5 }}><RotateCcw size={13} /> Reset</button>
                  <button onClick={save} disabled={!isDirty || saveMut.isPending}
                    style={{ ...btnG, fontSize: 11.5, padding: '7px 14px', opacity: (!isDirty || saveMut.isPending) ? 0.55 : 1 }}>
                    <Save size={13} /> {saveMut.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#8b94b3', lineHeight: 1.5 }}>
                  Dashboard is always available and can't be hidden. Changes apply on the user's next sign-in (or within ~10 minutes).
                </p>
              </div>

              {/* Sections */}
              {visibleCatalog.length === 0 && (
                <div style={{ ...card, padding: 24, textAlign: 'center', color: '#8b94b3', fontSize: 12.5 }}>No pages match “{pageSearch}”.</div>
              )}
              {visibleCatalog.map((s) => {
                const isCollapsed = collapsed.has(s.section) && !q;
                const total = s.items.length;
                const hiddenN = s.items.filter((i) => draft.has(i.key)).length;
                const allOn = hiddenN === 0;
                return (
                  <div key={s.section} style={{ ...card, padding: 0, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f7f8fb', borderBottom: isCollapsed ? 'none' : '1px solid #eef0f6' }}>
                      <button onClick={() => toggleCollapse(s.section)} disabled={!!q}
                        style={{ background: 'none', border: 'none', cursor: q ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, flex: 1, padding: 0 }}>
                        {!q && (isCollapsed ? <ChevronRight size={15} color="#5a6691" /> : <ChevronDown size={15} color="#5a6691" />)}
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: DARK }}>{s.section}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: hiddenN ? '#A32D2D' : '#27963c' }}>
                          {hiddenN ? `${total - hiddenN}/${total} visible` : `all ${total} visible`}
                        </span>
                      </button>
                      <button onClick={() => setSection(s, true)} style={{ ...btnGh, fontSize: 10, padding: '3px 8px' }}>Show all</button>
                      <button onClick={() => setSection(s, false)} style={{ ...btnGh, fontSize: 10, padding: '3px 8px', color: '#A32D2D' }}>Hide all</button>
                    </div>
                    {!isCollapsed && (
                      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 0 }}>
                        {s.items.map((it) => {
                          const on = isVisible(it.key);
                          return (
                            <label key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer' }}>
                              <Switch on={on} onChange={() => toggleOne(it.key)} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? DARK : '#9aa3bd', textDecoration: on ? 'none' : 'line-through' }}>{it.label}</div>
                                <div style={{ fontSize: 10, color: '#aab2c8', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.key}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
