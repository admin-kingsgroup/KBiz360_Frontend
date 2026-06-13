# Spec — Minimized / Parked Items Tray in the ContextBar

Status: **Implemented** (v1) — 2026-06-13
Owner: TBD · Last updated: 2026-06-13

**Decisions locked (defaults):** A = persisted in `prefs.parked` (server-synced) ·
B = ledgers + routes · C = cap 6, oldest-out · D = warn on unsaved edits ·
E = grey out / disable restore for non-matching-branch chips.

**Files:** `src/core/ux/dockCore.js` (pure logic) · `src/core/ux/dock.jsx`
(provider/hook) · `src/core/LedgerModalHost.jsx` (minimize button) ·
`src/shell/ContextBar.jsx` (tray + Ctrl/⌘+1…9 + recents fix) · `src/App.jsx`
(DockProvider + logout clear) · `src/shell/ShortcutHelp.jsx` (keymap) ·
`src/core/ux/__tests__/dock.test.jsx` (10 tests).

A taskbar-style tray in the app-wide ContextBar that lets a user **minimize** a
report or ledger and **restore** it later, without losing their place. Today the
app has no minimize concept: navigating unmounts the current screen, and the
ledger modal is only open-or-closed.

---

## 1. Goal

Make the ERP feel like a workspace: park what you're looking at, jump elsewhere,
come back — from anywhere, via the ContextBar.

Non-goals (v1): multi-window tiling, drag-reorder, cross-device live sync of open
state.

---

## 2. Current state (reference)

| Mechanism | File | Note |
|---|---|---|
| Recents (auto history) | `src/shell/ContextBar.jsx:23-32` | Passive; not user-chosen; no preserved state |
| Route swap (one screen) | `src/App.jsx:97-108` | Navigating **unmounts** the old screen |
| Ledger modal | `src/core/LedgerModalHost.jsx` | Open/closed only; uses **live shell branch** (`:47`) |
| Modal stack (Esc/LIFO) | `src/core/ux/modalStore.js` | Pattern to mirror for the dock store |
| Per-user prefs | `src/core/prefs.jsx` | `/api/user-prefs` shallow-merges top-level keys |
| `Ctrl L` ledger switch | `src/shell/LedgerSwitcher.jsx:25` | Already wired (works) |

---

## 3. Scope (v1)

- **Kind A — Ledger:** minimize the full-screen ledger modal into a chip. State
  is `{ name, from, to, branch }`; restore re-opens and re-fetches. **Highest
  value / lowest effort — ship first.**
- **Kind B — Route/report (snapshot):** minimize the current screen into a chip
  storing `{ route, label }`; restore re-navigates and the screen reloads fresh.
  In-progress filters/scroll are **not** preserved in v1 (see Open Decision D).

Both kinds live in one shared **dock store** and render in one tray UI.

---

## 4. Architecture

### 4.1 Dock store — `src/core/ux/dockStore.js` (new)
Module-level store mirroring `modalStore.js` (not React state), with a subscribe
hook for the ContextBar.

```
item = {
  id,            // stable: `${kind}:${name|route}:${branch}`
  kind,          // 'ledger' | 'route'
  label,         // chip text
  branch,        // branch code pinned at minimize time  ← see §5
  payload,       // ledger: {name, from, to} · route: {route}
}
```
API: `park(item)`, `unpark(id)`, `restore(id)`, `list()`, `subscribe(fn)`,
`clear()`. Dedupe by `id`. Cap per Open Decision C.

### 4.2 Ledger minimize
Add a `▁` button beside `✕` in `LedgerModalHost.jsx:54-57`. On click: `park({
kind:'ledger', ... })` then hide the overlay (don't destroy `job`). Restore
re-dispatches the existing `kb:ledger-modal` event.

### 4.3 Route park
A "Park" affordance (button in ContextBar or per-screen). `restore` calls
`nav.navigate(route)`.

### 4.4 Tray UI
Render chips in ContextBar next to `🕑 Recent`. Each chip: icon + label (branch
badge) + ✕. Overflow → "+N more". Mobile → single "Parked (N)" button.

---

## 5. ⚠️ Branch isolation (critical)

The ledger modal always reads the **live shell branch** (`LedgerModalHost.jsx:47`).
Without care, minimizing under Branch A, switching to B, then restoring shows
**B's data under an A label** — violates the branch-isolation rule.

**Required:** pin `branch` onto every item at minimize time; restore with that
branch; **badge the chip with its branch code** (e.g. `📒 Global Konnection · BOM`).
Decide tray behavior on branch switch (Open Decision E).

---

## 6. Lifecycle & limits

1. **Persistence:** Open Decision A (session-only vs `prefs.parked`).
2. **Logout/expiry:** `App.jsx onExpired` must call `dockStore.clear()` — never
   leak one user's parked items to the next.
3. **Cap + eviction:** Open Decision C.
4. **Dedupe:** by `id` (kind+name/route+branch).

---

## 7. Correctness / edge cases

- **Unsaved edits:** modal may have a `VoucherEditor` open
  (`LedgerModalHost.jsx:72-81`). Minimize mid-edit → Open Decision D.
- **Stale on restore:** always re-fetch on restore (don't cache numbers).
- **Esc precedence:** modalStore is LIFO; define Esc when a chip is focused vs a
  modal is open (don't fire two actions).
- **Restore target:** route restore navigates away from the current screen;
  ledger restore opens a modal (non-destructive).
- **Truncation/loading:** tooltip with full label; placeholder before name resolves.

---

## 8. Accessibility

Chips are focusable `<button>`s with `aria-label`; dropdown uses roving focus;
keyboard `Ctrl+1..9` jumps to chips. Document keys in
`src/shell/ShortcutHelp.jsx` (`SHORTCUTS` is the single source of truth).

---

## 9. UX fixes to bundle

- Recents dropdown closes on `onMouseLeave` (`ContextBar.jsx:66`) — switch to
  click-toggle + outside-click/Esc close.
- Bar is `overflow:hidden nowrap` (`ContextBar.jsx:49`) — handle breadcrumb +
  chips collision.
- Optional: ⭐ favorites (permanent, survive recents cap); active-branch chip.

---

## 10. Backend

No backend change needed unless the tray is persisted server-side — then a new
top-level `parked` key on `/api/user-prefs` works as-is (shallow-merge,
`prefs.jsx:8`). Confirm via Open Decision A.

---

## 11. Testing (repo rule)

Jest scenario tests for the dock store: add / restore / dedupe / evict /
branch-pin / logout-clear. Verify FE↔modal wiring and dynamic-live behavior
before push.

---

## 12. Open decisions (need sign-off before build)

- **A. Persistence:** session-only, or persisted in `prefs.parked` (server-synced)?
- **B. Scope:** ledgers only, or routes/reports too in v1?
- **C. Max chips + overflow:** cap (e.g. 6) and oldest-out vs block vs "+N more"?
- **D. Minimize with unsaved edits:** block · warn · stash?
- **E. On branch switch:** grey out non-matching chips · keep (branch-pinned) · clear?

---

## 13. Suggested rollout order

1. Dock store + ledger minimize (Kind A) with branch pinned & badged
2. Recents dropdown fix
3. Route park (Kind B) + tray overflow + favorites
4. Active-branch chip + `Ctrl+1..9`
