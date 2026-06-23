# KBiz360 Pro — UI Theme & Conventions

The premium visual system for KBiz360-Books. Graphite + refined gold, soft
near-white surfaces, Inter typography, soft shadows, ERP-dense but calm.
**Do not change** business logic, APIs, routes, permissions, calculations, or
print/export behavior when restyling.

---

## 1. Theme tokens

Source of truth: `tailwind.config.js` (Tailwind tokens) mirrored by CSS vars in
`src/index.css` (`--kb-*`). Legacy token NAMES are kept and re-valued, so existing
classes re-theme automatically.

| Role | Tailwind | Value |
|---|---|---|
| App background | `bg-bg` | `#f7f8fa` |
| Surface / card | `bg-surface` | `#ffffff` |
| Muted surface | `bg-surface-alt` | `#f4f5f7` |
| Border (subtle) | `border-surface-border` | `#e6e8ec` |
| Foreground (ink) | `text-ink` | `#14161a` |
| Muted text | `text-ink-muted` | `#5b616e` |
| Subtle text | `text-ink-subtle` | `#9197a3` |
| Primary / graphite | `bg-navy` / `text-navy` | `#1a1c22` (hover `navy-light` `#2e323c`) |
| Accent / refined gold | `bg-gold` / `text-gold` | `#c2a04a` (`gold-dark` `#98792c`, `gold-light` `#efe3bf`) |
| Success | `success` / `success-soft` | `#16a34a` / `#e8f6ed` |
| Warning | `warning` / `warning-soft` | `#d97706` / `#fbeedb` |
| Danger | `danger` / `danger-soft` | `#dc2626` / `#fbe9e9` |
| Info / link / focus | `info` / `info-soft` | `#2563eb` / `#e8f0ff` |

Elevation: `shadow-xs | shadow-sm | shadow-card | shadow-pop`. Radius: `rounded-brand`
(12px), 8–16px system. Motion: `duration-fast` (140ms) / `duration-med` (240ms) +
`ease-premium`. Numbers: `tnum` / `tabular-nums`. Never hardcode legacy hex
(`#0d1326`, `#d4a437`, `#185FA5`, …) — use tokens.

Typography classes (index.css): `.kbiz-page-title`, `.kbiz-section-title`,
`.kbiz-card-title`, `.kbiz-body`, `.kbiz-label`, `.kbiz-caption`, `.kbiz-table-text`.

---

## 2. Responsive rules

Breakpoints (mobile-first): `tablet` = 768px, `desktop` = 1024px.
The **mobile shell** (hamburger + drawer + compact header controls) is active
**below `desktop` (1024)** — so shell touch sizing uses `max-desktop:`, not `max-tablet:`.

Verify every screen at **375×812 · 768×1024 · 1280×720 · 1440×900**.

- Mobile: single column, filters stack/wrap, no horizontal **page** overflow.
- Tables: horizontal scroll lives **inside the table container only** (never the page).
- Laptop/desktop: dense but breathable (`desktop:px-8`), nav must not clip.

---

## 3. Touch-target rules (≥44px)

- **Shell controls** (logo, bell, hamburger, drawer close, FY/branch/user triggers,
  drawer search): `max-desktop:min-h-[44px] max-desktop:min-w-[44px]` (or `h-11 w-11`
  when the control is mobile-only). Desktop stays compact (`h-9` / 32px).
- **Content controls** (form inputs, page-filter buttons, DataTable toolbar):
  `max-tablet:min-h-[44px]` / `max-tablet:h-11`; icon-only buttons add
  `max-tablet:w-11 max-tablet:px-0`.
- Use `min-h`/`min-w` (they override fixed inline `width`/`height` on mobile with no
  desktop regression).
- Keyboard focus must be visible: `focus-visible:shadow-focus-ring`
  (or `peer-/group-focus-visible:ring-2 ring-info/50`).

---

## 4. PageLayout & DataTable conventions

**PageLayout** (`src/shell/PageLayout.jsx`) is the standard scaffold. Props (stable):
`title, subtitle, breadcrumbs, actions, filters, children, maxWidth, className`.
Anatomy: Breadcrumb → Title/Subtitle + Actions → Filters bar → Content. Composable
exports: `PageHeader`, `PageActions`, `PageFilters` (+ `scroll` variant),
`SectionHeader`, `Breadcrumb`. Avoid card-on-card nesting (filters are a bar, not a card).

**DataTable** (`src/shell/DataTable.jsx`): graphite header / gold labels via tokens,
sticky header + totals footer, density + column toggles, Excel/Print (with toast
feedback), `.kb-skeleton` loading rows, first-class empty/error states. On mobile the
search takes a full-width row (`max-tablet:basis-full`) and action buttons wrap below;
toolbar buttons are ≥44px. Keep it ERP-dense — don't over-space.

**Primitives** (`src/shell/primitives.jsx`): Button, IconButton, Input, Select,
Textarea, Checkbox, Switch, StatusPill/Badge, Card, Panel, Drawer, Tooltip,
Skeleton/SkeletonText/SkeletonTable/SkeletonCards, EmptyState, ErrorState, LoadingState.
Prefer these over bespoke markup.

**Toasts** (`src/core/ux/toast.jsx`): `toastSuccess/Error/Warning/Info`. Use for
user-triggered actions (save/create/update/delete/approve, export/print, retry
failure). **Never** toast passive fetch successes. Mount `<ToastHost/>` once (already
in App.jsx).

---

## 5. Migration checklist (per screen)

- [ ] Wrap in `PageLayout` (title/subtitle/breadcrumbs/actions/filters).
- [ ] Raw `<table>` → `DataTable` (or wrap custom statements in a responsive scroll box).
- [ ] Replace inline-style controls with primitives (Button/Input/Select/StatusPill…).
- [ ] No legacy hex — use tokens; numeric columns `tabular-nums`.
- [ ] Loading → `Skeleton*`; empty → `EmptyState`; error → `ErrorState` + retry toast.
- [ ] Action toasts for save/export/print/approve; no passive-fetch toasts.
- [ ] Touch targets per §3; filters wrap; no horizontal page overflow.
- [ ] **Do not** change calculations, data mapping, routes, APIs, or print/export.
- [ ] Verify at 375 / 768 / 1280 / 1440; `npm run build` + `npm test` green.
