# KBiz360 — Project Context for LLMs & Developers

> **Single-source context document.** Read this entire file before making any changes to the KBiz360 codebase. It captures business rules, architecture, conventions, constraints, and the "why" behind decisions that aren't obvious from the code alone.
>
> **🆕 v2.0:** The monolithic `App.jsx` has been refactored into a **34-file modular structure** for maintainability and LLM-friendly small-context edits.

**Document version:** 2.0 · **Project state:** Production-ready modular React app · **0 parse errors across 34 files**

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Business Context](#2-business-context)
3. [People & Roles (6 Users · 4 Tiers)](#3-people--roles)
4. [Entities & Branches (2 Branches)](#4-entities--branches)
5. [Tech Stack](#5-tech-stack)
6. [Modular File Structure (NEW)](#6-modular-file-structure)
7. [How to Find What — LLM Context Map](#7-how-to-find-what)
8. [Module Catalog (11 Top-Level Modules)](#8-module-catalog)
9. [Approval & Control Framework](#9-approval--control-framework)
10. [Code Conventions](#10-code-conventions)
11. [Gotchas & Things NOT to Do](#11-gotchas--things-not-to-do)
12. [How to Add a New Screen](#12-how-to-add-a-new-screen)
13. [How to Add a New User Role](#13-how-to-add-a-new-user-role)
14. [Brand Assets & Design Tokens](#14-brand-assets--design-tokens)
15. [Glossary](#15-glossary)

---

## 1. Project Identity

| Attribute | Value |
|---|---|
| **Product name** | KBiz360 |
| **Tagline** | THE BUSINESS ENGINE |
| **Subtitle** | Smart Travel ERP |
| **Built for** | Travkings Tours & Travels Pvt. Ltd. |
| **Version** | 1.0 (production) |
| **Internal function name** | `KB360App` (legacy — do not rename, never visible to users) |
| **App icon** | Pinwheel logo on dark rounded-square (5 colored blades: purple, cream, blue, teal, orange, red) |

The brand evolved from "KB360" → "KBiz360" in May 2026. Every user-facing instance of "KB360" should display as "KBiz360". Internal JavaScript identifiers (like `KB360App`) were intentionally NOT renamed.

---

## 2. Business Context

**Travkings Tours & Travels** is a two-branch India travel agency:

- **Established:** 2008 · **IATA Accredited** · **GST 27AAACT1234A1ZF** · **Mumbai HQ**
- **Operations:** 2 branches in India (Mumbai, Ahmedabad) — INR only, GST only
- **Scale:** ~500 bookings/month, ~₹8-9 Cr monthly revenue, active employees across both branches
- **Services:** Inbound/outbound tour packages, IATA airline ticketing, visa services, MICE, DMC operations

### Why KBiz360 exists

Before KBiz360, each branch ran its own spreadsheets — no consolidated view, manual GST compliance for both branches, no audit trail on approvals, vendor bank-account changes were a fraud vector, month-end close took 12+ days. KBiz360 unifies both branches into a single role-controlled platform.

### Two-branch structure

The business operates **two India branches — BOM (Mumbai) and AMD (Ahmedabad)** — with no separate Head Office entity. Both branches are INR-only and GST-only. Shared-services activity (asset purchases, running expenses, vendor masters, banking relationships, statutory filings, and group approval authority) is administered centrally out of the Mumbai (BOM) branch, which also consolidates GST input credit.

---

## 3. People & Roles

### The 4-Tier Hierarchy

```
Tier 0 — System          AD (Super Admin)                   [TK-SYS-001]
Tier 1 — Leadership      Afshin Dhanani (Director/Founder)  [TK-HO-000]
Tier 2 — Finance Mgmt    Faiz Patel (Sr. Finance Mgr/CFO)   [TK-HO-001]
Tier 3 — Checker         Sughra Sayed (Sr. Accounts Exec)   [TK-HO-002]
Tier 4 — Maker           2× Branch Accounts Executives      [TK-{BRANCH}-00X]
                         ├── Rohan   (BOM)
                         └── Mohan   (AMD)
```

### Complete user table

| Tier | Name | Employee ID | Role | Branches | Email |
|---|---|---|---|---|---|
| 0 | AD | TK-SYS-001 | Super Admin | BOM, AMD | ad@travkings.com |
| 1 | Afshin Dhanani | TK-HO-000 | Director | BOM, AMD | afshin@travkings.com |
| 2 | Faiz Patel | TK-HO-001 | Senior Finance Manager | BOM, AMD | faiz.fm@travkings.com |
| 3 | Sughra Sayed | TK-HO-002 | Sr. Accounts Executive | BOM, AMD | sughra.sae@travkings.com |
| 4 | Rohan | TK-BOM-003 | Accounts Executive | BOM only | rohan@travkings.com |
| 4 | Mohan | TK-AMD-002 | Accounts Executive | AMD only | mohan@travkings.com |

### Role colors (use exact hex values)

| Role | Color | Hex |
|---|---|---|
| Super Admin | Maroon | `#A32D2D` |
| Director | Dark Maroon | `#3C1B14` |
| Sr. Finance Manager | Navy | `#0d1326` |
| Sr. Accounts Executive | Purple | `#6B4C8B` |
| Accounts Executive | Teal | `#2F7A8E` |
| HR Manager | Slate Blue | `#384677` |

---

## 4. Entities & Branches

| Code | City | Country | Role | Currency | Tax Regime |
|---|---|---|---|---|---|
| **BOM** | Mumbai | 🇮🇳 India | Operating branch (largest) · shared-services hub | INR | GST 5%/18% |
| **AMD** | Ahmedabad | 🇮🇳 India | Operating branch | INR | GST 5%/18% |

**"Travkings Group"** = the consolidation label used when aggregating both branches.

---

## 5. Tech Stack

| Layer | Technology | Status |
|---|---|---|
| **Framework** | React 18 (Strict Mode) | ✅ In use |
| **Build tool** | Vite 5 + esbuild minification | ✅ In use |
| **Language** | JavaScript + JSX (no TypeScript) | ✅ In use |
| **Styling — legacy** | Inline `style={{...}}` objects | ⚠️ Existing code (being phased out) |
| **Styling — new** | **Tailwind CSS 3.4** with brand colors pre-configured | ✅ Use for ALL new code |
| **Icons** | `lucide-react` (36 icons used) | ✅ In use |
| **Charts** | `recharts` | ✅ In use |
| **State — local** | React hooks (`useState`, `useEffect`, `useMemo`, `useRef`) | ✅ In use |
| **State — global** | **Zustand 4** in `src/store/` (scaffolding ready) | ⏸️ Available but not yet adopted |
| **Server state** | **@tanstack/react-query 5** (provider already wired in `main.jsx`) | ⏸️ Ready for when backend lands |
| **Routing** | Simple string-matching switch (NO React Router) | ✅ In use |
| **Persistence** | None — pure frontend with embedded sample data | ✅ In use |
| **Backend** | None — fully self-contained UI | ⏸️ Future addition |

### Why these choices

- **Vite + esbuild:** Fast dev startup, fast HMR, modern ES module support out of the box.
- **Tailwind CSS:** Industry-standard utility-first CSS. Brand colors (`navy`, `gold`, `maroon`, `pinwheel-*`, `role-*`, `ink-*`, `surface-*`) are pre-configured in `tailwind.config.js`. Use Tailwind for all new code; existing inline styles continue to work and will be migrated opportunistically.
- **Zustand:** Tiny (~1 KB) state library, no boilerplate, no providers needed. Stores in `src/store/auth.js` and `src/store/ui.js` are SCAFFOLDING — current app uses local React state. Migrate when prop-drilling becomes painful (typically: when 3+ non-shell modules need to share the same state).
- **TanStack Query:** The standard for server state. `QueryClientProvider` is already wired in `main.jsx`. Use this for ALL API/network state when a backend lands — never use Zustand for server data.
- **No router library:** A simple string-based route state (`useState("/dashboard")`) is enough for 200+ routes.

### Tailwind brand palette (use these class names, not hex values)

| Class | Color | Original Hex |
|---|---|---|
| `bg-navy` / `text-navy` | KBiz360 primary | `#0d1326` |
| `bg-navy-light` | gradient secondary | `#1a2340` |
| `bg-gold` / `text-gold` | Primary accent / CTAs | `#d4a437` |
| `bg-gold-dark` / `text-gold-dark` | Hover/pressed | `#9a6810` |
| `bg-gold-light` | Soft backgrounds | `#f7d97a` |
| `bg-maroon` / `text-maroon` | Travkings accent / alerts | `#A32D2D` |
| `bg-maroon-dark` | Director role | `#3C1B14` |
| `text-ink` | Body text | `#1a1a1a` |
| `text-ink-muted` | Secondary text | `#5a6691` |
| `text-ink-subtle` | Tertiary text | `#8b94b3` |
| `bg-surface` | Card bg | `#ffffff` |
| `bg-surface-alt` | Page bg | `#f7f8fb` |
| `border-surface-border` | Dividers | `#e1e3ec` |
| `bg-role-director` | Avatar bg (Director) | `#3C1B14` |
| `bg-role-srfm` | Avatar bg (Sr. FM) | `#0d1326` |
| `bg-role-srae` | Avatar bg (Sr. AE) | `#6B4C8B` |
| `bg-role-ae` | Avatar bg (Accounts Exec) | `#2F7A8E` |
| `bg-role-hr` | Avatar bg (HR Manager) | `#384677` |
| `bg-role-admin` | Avatar bg (Super Admin) | `#A32D2D` |
| `bg-pinwheel-purple/blue/teal/orange/red/grey` | Logo blade colors | (various) |

Custom component classes available via `@apply` (defined in `src/index.css`):
- `.kbiz-card` — standard white card (replaces `cardStyle`)
- `.kbiz-input` — standard input (replaces `inpStd`)
- `.kbiz-btn-primary` — navy + gold CTA button
- `.kbiz-btn-accent` — gold accent button
- `.kbiz-touchable` — 44px+ touch target with no tap highlight
- `.kbiz-tagline` — "THE BUSINESS ENGINE" caps treatment

---

## 6. Modular File Structure

The project was refactored from a single 28,500-line `App.jsx` into a clean module-wise structure. This dramatically reduces the context size needed to edit any single feature.

```
src/
├── App.jsx                          🌐 Root component (384 lines)
├── main.jsx                         🚪 React entry — wraps App in QueryClientProvider
├── index.css                        🎨 Tailwind directives + @layer components
│
├── core/                            🔧 Shared utilities — rarely edited (10 files)
│   ├── brand.js                     KBIZ_LOGO (base64 PNG)
│   ├── data.js                      BRANCHES, _USERS_DATA, sample data (1,166 lines · 56 decls)
│   ├── permissions.js               ROLE_TEMPLATES, PERM_MODULES, canAccessModule (223 lines)
│   ├── menus.js                     MENU_* + getMenu() + MENU_TO_GROUP (382 lines · 11 decls)
│   ├── format.js                    fmtINR, fmtDate (16 lines)
│   ├── hooks.js                     useMobile, useNotifRefresh, useSaveRefresh (73 lines · 7 decls)
│   ├── styles.js                    cardStyle, RPT_thStyle, KPICard, WidgetCard (1,236 lines · 44 decls)
│   ├── voucher-print.js             HTML voucher template (117 lines)
│   ├── business-logic.js            getUnreadCount, exportToCSV, etc. (66 lines · 9 decls)
│   └── helpers.js                   Small misc utilities (2,693 lines · 161 decls)
│
├── store/                           🗂️ Zustand stores — scaffolding ready (2 files)
│   ├── auth.js                      Auth store: currentUser, signOut, role checks
│   └── ui.js                        UI store: sidebar, activeBranch, route, toasts
│
├── shell/                           🏛️ App chrome (TopBar, SideNav, modals) — 9 files
│   ├── TopBar.jsx                   Top header bar with branding + UserMenu (71 lines)
│   ├── SideNav.jsx                  Left navigation with collapsible menus (170 lines)
│   ├── UserMenu.jsx                 Avatar dropdown + Sign Out (127 lines)
│   ├── UserSwitcher.jsx             Role switcher (66 lines)
│   ├── BranchSwitcher.jsx           Branch selector (61 lines)
│   ├── NotifPanel.jsx               Notifications dropdown (149 lines)
│   ├── PHASE2_Page.jsx              Standard page wrapper (22 lines)
│   ├── Placeholder.jsx              Fallback for unauthorized routes (19 lines)
│   └── GlobalSearch.jsx             Spotlight-style search (86 lines)
│
├── auth/                            🔐 Login/logout screens (2 files)
│   ├── LoginScreen.jsx              Travkings + KBiz360 dual-branding login (323 lines · inline styles)
│   └── SignedOutScreen.jsx          Post-sign-out card (90 lines · ✅ Tailwind reference impl)
│
└── modules/                         📦 Business modules — feature folders + legacy single files
    ├── dashboard/                   🆕 Feature folder (canonical pattern — see §11b)
    │   ├── api/                     Data accessors (get-bills, get-action-items, …)
    │   ├── components/{cards,tables,shared}/  Reusable widgets (22 files)
    │   ├── hooks/                   TanStack Query hooks (one per role view)
    │   ├── pages/                   6 role-based page components (thin orchestrators)
    │   ├── routes/                  Declarative route table
    │   ├── schemas/                 Entity shapes (ready for Zod)
    │   ├── services/                Facade over api/ + transformers
    │   ├── store/                   Zustand store for UI-only state (period, pinned)
    │   ├── utils/                   constants · helpers · transformers
    │   ├── index.js                 Barrel preserving legacy named exports
    │   └── README.md                Layering rules + replication guide
    ├── transactions.jsx             Sales, Purchase, Receipts, Payments, Vouchers (4,459 lines · 39 components)
    ├── operations.jsx               Booking files, Itinerary, Passports (413 lines · 3 components)
    ├── finance.jsx                  Bank, TDS, Treasury, Reconciliation (1,932 lines · 20 components)
    ├── reports.jsx                  P&L, GP, Yield, Custom builder (3,483 lines · 29 components)
    ├── taxation.jsx                 GSTR, Form 16, TDS, Tax calendar (1,665 lines · 24 components)
    ├── hr.jsx                       Employee master, payroll, self-service (2,236 lines · 18 components)
    ├── masters.jsx                  Customer, Supplier, CoA, Currency masters (2,924 lines · 25 components)
    ├── ho-control.jsx               Group dashboard, vendor lock, audit, authority config (1,459 lines · 16 components)
    ├── assets.jsx                   Fixed asset register, depreciation (564 lines · 5 components)
    └── settings.jsx                 Doc templates, branding, permissions, approvals (1,769 lines · 15 components)
```

### Project root files (outside `src/`)

```
kbiz360-app/
├── public/
│   ├── kbiz360_appicon.png          App icon (favicon + apple-touch-icon)
│   └── kbiz360_logo.png             Wide brand lockup
├── docs/
│   └── KBiz360_User_Manual.pdf      46-page user manual
├── scripts/
│   ├── deploy-s3.sh                 S3 + CloudFront deploy script
│   └── deploy-amplify.sh            Amplify CLI deploy script
├── index.html                       Page shell with brand metadata
├── package.json                     React 18, Vite 5, lucide, recharts, Tailwind, Zustand, TanStack Query
├── vite.config.js                   Build config with code-splitting
├── tailwind.config.js               🎨 Tailwind brand colors + theme extensions
├── postcss.config.js                PostCSS pipeline for Tailwind
├── amplify.yml                      AWS Amplify build spec
├── .nvmrc                           Node 20
├── .gitignore
├── README.md                        Quick-start guide
├── DEPLOY_AWS.md                    AWS deployment guide
└── PROJECT_CONTEXT.md               THIS FILE — context for LLMs/developers
```

### Stats (compared to monolithic version)

| Metric | Monolithic v1 | Modular v2 |
|---|---|---|
| Files | 1 | 34 |
| Largest file | 28,505 lines | 4,459 lines (`transactions.jsx`) |
| Average file | 28,505 lines | 865 lines |
| LLM context for "edit a HR screen" | 28,500 lines | ~2,200 lines |
| LLM context for "fix a TDS calc bug" | 28,500 lines | ~1,900 lines |
| Parse errors | 0 | 0 |

---

## 7. How to Find What

**Use this lookup table to decide which file to open for any task.** This is the most important section for LLMs — read this BEFORE searching the codebase.

| Task | Open this file(s) |
|---|---|
| Change brand colors / logo | `core/brand.js` + `core/styles.js` + **`tailwind.config.js`** |
| Add/edit a branch | `core/data.js` (BRANCHES array) |
| Add/edit a user | `core/data.js` (_USERS_DATA array) |
| Change a role's permissions | `core/permissions.js` (ROLE_TEMPLATES) |
| Change menu structure / sidebar order | `core/menus.js` (MENU_* constants) |
| Edit shared styles (card, table headers, KPI tiles) | `core/styles.js` |
| **🆕 Edit Tailwind brand classes** | **`tailwind.config.js`** |
| **🆕 Edit global Tailwind component classes** (`.kbiz-card`, etc.) | **`src/index.css`** |
| **🆕 Migrate auth state to Zustand** | **`src/store/auth.js`** (scaffolding ready) |
| **🆕 Migrate UI state to Zustand** | **`src/store/ui.js`** (scaffolding ready) |
| **🆕 Add server data fetching** | Use TanStack Query (`useQuery` / `useMutation`) — provider already wired |
| Change format helpers (currency, date) | `core/format.js` |
| Edit a dashboard | `modules/dashboard/pages/<role>-dashboard.jsx` (feature folder — see §11b) |
| Edit transaction vouchers (sales, purchase, receipts, payments) | `modules/transactions.jsx` |
| Edit booking files / operations | `modules/operations.jsx` |
| Edit finance screens (bank, TDS, treasury, reco) | `modules/finance.jsx` |
| Edit reports | `modules/reports.jsx` |
| Edit GSTR/TDS prep | `modules/taxation.jsx` |
| Edit HR / payroll / self-service | `modules/hr.jsx` |
| Edit master data screens | `modules/masters.jsx` |
| Edit HO Control (group dashboard, vendor lock, audit, authority) | `modules/ho-control.jsx` |
| Edit fixed assets | `modules/assets.jsx` |
| Edit settings (templates, branding, approvals, permissions) | `modules/settings.jsx` |
| Edit login screen | `auth/LoginScreen.jsx` |
| Edit signed-out screen | `auth/SignedOutScreen.jsx` |
| Edit top bar / brand display | `shell/TopBar.jsx` |
| Edit sidebar layout / behavior | `shell/SideNav.jsx` |
| Edit user dropdown / sign-out flow | `shell/UserMenu.jsx` |
| Edit notifications | `shell/NotifPanel.jsx` |
| Add a NEW route to the router | `App.jsx` (Page function) |
| Add a NEW module folder | (See "How to Add a New Module" below) |

### Per-module LLM context examples

If an LLM needs to edit the **TDS Calculator** screen:
- Open `modules/finance.jsx` (1,932 lines)
- Reference `core/format.js` for `fmtINR`
- Reference `core/styles.js` for `cardStyle`, `inpStd`
- **Total context: ~3,500 lines** (vs 28,500 in monolithic v1 — 8× smaller)

If an LLM needs to add a new HR self-service screen:
- Open `modules/hr.jsx` (2,236 lines)
- Reference `shell/PHASE2_Page.jsx` (22 lines) for the page wrapper
- Reference `core/data.js` for HR sample data
- Reference `App.jsx` to wire the new route (384 lines)
- **Total context: ~3,800 lines** (vs 28,500 — 7.5× smaller)

---

## 8. Module Catalog

### Sidebar order (workflow-frequency based)

| # | Module | Purpose | Primary File |
|---|---|---|---|
| 1 | **Dashboard** | Role-specific home screen | `modules/dashboard/` (feature folder) |
| 2 | **Transactions** | Daily voucher entry | `modules/transactions.jsx` |
| 3 | **Operations** | Bookings, ticketing, itineraries | `modules/operations.jsx` |
| 4 | **Finance** | Reconciliation, TDS, treasury | `modules/finance.jsx` |
| 5 | **Reports** | P&L, GP analysis, yield reports | `modules/reports.jsx` |
| 6 | **Taxation** | GSTR auto-prep, TDS, tax calendar | `modules/taxation.jsx` |
| 7 | **HR & Payroll** | Employee master, payroll, self-service | `modules/hr.jsx` |
| 8 | **HO Control** | Group dashboard, vendor lock, audit, authority | `modules/ho-control.jsx` |
| 9 | **Masters** | Customers, suppliers, CoA, banks, currencies | `modules/masters.jsx` |
| 10 | **Assets** | Fixed asset register, depreciation | `modules/assets.jsx` |
| 11 | **Settings** | Users, branding, doc templates, approval matrix | `modules/settings.jsx` |

---

## 9. Approval & Control Framework

### Transactional approval ladder

| Voucher Type | AE Post Cap | Sughra Approve ≤ | Faiz Approve ≤ | Afshin (Above) |
|---|---|---|---|---|
| NEFT/RTGS Payment | ₹0 | ₹2,00,000 | ₹10,00,000 | Above ₹10L |
| Cash Payment | ₹5,000 | ₹25,000 | ₹1,00,000 | Above ₹1L |
| Journal Voucher | ₹0 | ₹50,000 | ₹5,00,000 | Above ₹5L |
| Credit Note / Refund | ₹0 | ₹25,000 | ₹5,00,000 | Above ₹5L |
| Receipt Voucher | ₹10,000 | ₹2,00,000 | ₹10,00,000 | Any |
| Asset Purchase | ₹0 | ₹0 | ₹2,00,000 | Above ₹2L |

### Master data change authority

| Change Type | Requester | Approver | Notes |
|---|---|---|---|
| New Customer/Supplier | AE / Sughra / Faiz | Sughra | After dup-check + credit check |
| Credit Limit ≤ ₹10L | Sughra / Faiz | Faiz | Faiz authority |
| Credit Limit > ₹10L | Sughra / Faiz | Afshin | Director mandatory |
| **Vendor Bank A/c** | Sughra only | Faiz | Highest-risk · email confirmation |
| Vendor PAN/GSTIN | Sughra only | Faiz | Consent letter required |
| Chart of Accounts | Faiz only | Faiz | Quarterly review |
| **User Permissions** | Faiz only | Faiz | Per spec — Faiz authority |
| Approval Matrix | Faiz only | Afshin | Director-only |
| Tax Code/GST Rate | Faiz only | Faiz | Statutory data |

### Time-based controls (defaults)

- **Soft-lock day:** 10th of next month (was 7th before May 2026)
- **Hard-lock:** 30 days after period-end
- **Dual-control threshold:** ₹10L (Afshin only above this)
- **After-hours cutoff:** 23:00 — vouchers after this go to Sughra's next-morning queue
- **Quarterly access review:** 15th of Jul/Oct/Jan/Apr (Afshin reviews)

All editable via `/settings/authority-config` (Tab D · Time-Based Controls), defined in `modules/ho-control.jsx`.

---

## 10. Code Conventions

### Naming

- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `BRANCHES`, `_USERS_DATA`, `PERM_MODULES`)
- **Components:** `PascalCase`, descriptive (e.g., `HOAssetProcurement`, `AuthorityConfigCenter`)
- **Style objects:** `camelCaseStyle` (e.g., `cardStyle`, `inpStd`, `RPT_thStyle`)
- **Helpers:** `camelCase` verbs (e.g., `fmtINR`, `fmtDate`, `canAccessModule`)
- **Route paths:** lowercase, kebab-case (e.g., `/ho/asset-procurement`)

### Style patterns (use these, do NOT redefine)

| Constant | Source File | Purpose |
|---|---|---|
| `cardStyle` | `core/styles.js` | Standard white card with border + padding |
| `RPT_thStyle` | `core/styles.js` | Report table header cell |
| `RPT_tdStyle` | `core/styles.js` | Report table body cell |
| `inpStd` | `core/styles.js` | Standard input field |
| `tabBtnStyle(active)` | `core/styles.js` | Tab button (active/inactive variant) |
| `KPICard` | `core/styles.js` | Standard KPI tile |
| `WidgetCard` | `core/styles.js` | Dashboard widget container |
| `fmtINR(n)` | `core/format.js` | Indian-format currency (₹1,23,45,678) |
| `fmtDate(d)` | `core/format.js` | DD-Mmm-YYYY format |

### Import pattern at top of every file

```jsx
// Auto-generated by the modular split — keep this pattern
import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { BarChart, Bar } from 'recharts';
import { BRANCHES, _USERS_DATA } from '../core/data';
import { cardStyle, inpStd } from '../core/styles';
import { fmtINR } from '../core/format';
import { useMobile } from '../core/hooks';
import { PHASE2_Page } from '../shell/PHASE2_Page';
```

### Brand colors

```js
NAVY      = "#0d1326"    // primary brand
GOLD      = "#d4a437"    // accent / CTAs
MAROON    = "#A32D2D"    // alerts / Travkings accent
GREY_TXT  = "#5a6691"    // muted text
GREY_BG   = "#f7f8fb"    // page bg
GREEN     = "#22c55e"    // success
ORANGE    = "#f97316"    // warning
RED       = "#dc3545"    // error
```

---

## 11. Gotchas & Things NOT to Do

### ⚠️ DO NOT

1. **DO NOT merge module files back into one.** The whole point of the refactor is small focused files. If a new module grows beyond 5,000 lines, split it further — don't combine. The next-level split is the feature-folder pattern in §11b (see `modules/dashboard/`).

2. **DO NOT introduce duplicate identifiers across files.** ES modules namespace by file but the original codebase had naming patterns (`PERM_MODULES_P2`, `TDS_SECTIONS_TABLE`, `TaxCalendarV2`) to avoid conflict. Honor those conventions.

3. **DO NOT use `localStorage`, `sessionStorage`, IndexedDB, or any browser storage.** The app was designed to work in artifact-style sandboxes that block these APIs. All state lives in React state.

4. **DO NOT add a backend or assume one exists.** This is a pure frontend with embedded sample data.

5. **DO NOT use React Router.** Stick with `useState` for state and the `Page()` function in `App.jsx` for routing.

6. **🆕 DO NOT mix Tailwind dynamic class strings.** Tailwind only sees classes that appear as static strings. Bad: `className={`text-[${color}]`}`. Good: `style={{ color }}` for dynamic values. The build-time scanner can't follow JS expressions inside class strings.

7. **🆕 DO NOT use Zustand for server data.** Zustand is for CLIENT state (UI, auth session). Use TanStack Query for ALL server/API data — never store API responses in Zustand.

8. **🆕 DO NOT rewrite existing inline-style components to Tailwind in bulk.** Migrate opportunistically when you're already editing a file. A big-bang rewrite risks visual regressions that are hard to verify.

9. **DO NOT rename `KB360App`** — this internal function name is the default export from `App.jsx`. Never visible to users.

10. **DO NOT shrink touch targets below 44px** (top-level) or **40px** (sub-items). Apple HIG recommends ≥44px minimum.

11. **DO NOT add icons from outside `lucide-react`** without first checking if a similar icon exists in lucide.

12. **DO NOT import from `App.jsx` into a module file.** App.jsx imports FROM modules, never the other way around. This prevents circular imports.

### ⚠️ Watch out for

- **Split brand strings in JSX:** "KBiz360" used to render as `<span>KB</span>360`. A text search wouldn't catch this pattern. When rebranding, search for both whole strings AND split patterns.
- **Cross-module imports:** If a component in `modules/transactions.jsx` needs something from `modules/finance.jsx`, prefer to lift that shared piece into `core/` instead of cross-importing modules.
- **Tailwind class purging:** If you build dynamic class names (e.g., `bg-${color}-500`), Tailwind won't include them in the production bundle. Use the `safelist` config option or refactor to use `style={{}}` instead.

---

## 11a. Tailwind / Zustand / TanStack Query Migration Playbook 🆕

### Tailwind CSS — adopting opportunistically

The codebase has two styling approaches coexisting:

| Style approach | When to use | Where it lives |
|---|---|---|
| **Inline `style={{...}}`** (legacy) | Existing untouched code; truly dynamic values (e.g., `style={{ color: roleColor }}`) | Throughout existing modules |
| **Tailwind `className="..."`** (preferred) | All NEW components; existing components when you're already editing them | New code |

**Reference implementation:** `src/auth/SignedOutScreen.jsx` is the canonical Tailwind example. Open it before writing your first Tailwind component.

**Migration rules:**
- ✅ Migrate a component when you're already editing it for a feature/bugfix
- ✅ Use the pre-configured brand classes (`bg-navy`, `text-gold`, etc.) — see Section 5 table
- ✅ Use the `@layer components` classes for repeated patterns: `.kbiz-card`, `.kbiz-btn-primary`, `.kbiz-input`, `.kbiz-touchable`, `.kbiz-tagline`
- ❌ Don't do a "big bang" rewrite of all 28,500 lines of styles — too risky, hard to verify
- ❌ Don't use string interpolation in `className` (Tailwind can't see it)

**Common conversions:**

| Inline (legacy) | Tailwind (preferred) |
|---|---|
| `style={{ background: "#0d1326", color: "#d4a437" }}` | `className="bg-navy text-gold"` |
| `style={{ padding: 20, margin: 0 }}` | `className="p-5 m-0"` |
| `style={{ fontSize: 12, fontWeight: 700 }}` | `className="text-xs font-bold"` |
| `style={{ display: "flex", alignItems: "center", gap: 8 }}` | `className="flex items-center gap-2"` |
| Custom gradient | Keep inline — `style={{ background: "linear-gradient(...)" }}` |
| `style={{ color: roleColor }}` (dynamic) | Keep inline — Tailwind can't resolve runtime values |

### Zustand — when to migrate state to a store

The stores in `src/store/` (`auth.js`, `ui.js`) are SCAFFOLDING. Current app keeps state in `KB360App` local React state.

**Migrate to Zustand when:**
- ✅ 3+ non-shell components need to read/write the same state
- ✅ Prop-drilling becomes painful (you're passing the same prop through 4+ levels)
- ✅ You want to avoid unnecessary re-renders (Zustand only re-renders subscribers, not the whole tree)
- ✅ You add real authentication with a backend

**Do NOT migrate to Zustand for:**
- ❌ State used only by 1-2 components → keep local
- ❌ Form input state → keep local
- ❌ Server data (API responses) → use TanStack Query instead

**Example migration pattern:**

```jsx
// BEFORE (KB360App local state)
const [currentUser, setCurrentUser] = useState(null);

// AFTER (Zustand store)
import { useAuthStore } from './store/auth';
const currentUser = useAuthStore(s => s.currentUser);
const setCurrentUser = useAuthStore(s => s.setCurrentUser);
```

### TanStack Query — when you add a backend

`QueryClientProvider` is ALREADY WIRED in `main.jsx`. When you add real APIs:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['customers', branchCode],
  queryFn: () => fetch(`/api/customers?branch=${branchCode}`).then(r => r.json()),
});

// Mutations
const mutation = useMutation({
  mutationFn: (newCustomer) => fetch('/api/customers', { method: 'POST', body: JSON.stringify(newCustomer) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
});
```

**Rules:**
- ✅ ALL network/API state goes through TanStack Query
- ✅ Use `queryKey` arrays consistently (e.g., `['customers', branchCode]`)
- ✅ Use `invalidateQueries` after mutations to refresh stale data
- ❌ Don't store API responses in Zustand — let TanStack Query manage the cache

---

## 11b. Feature-Folder Architecture 🆕

The `modules/dashboard/` folder is the **canonical pattern** for migrating
monolithic module files (`modules/<name>.jsx`) into a scalable layout. The
other 10 modules remain single-file until migrated; both styles coexist.

### Canonical layout

```
modules/<feature>/
├── api/         Data accessors — one verb per file (get-*, create-*, …)
├── components/
│   ├── cards/   KPI / stat cards
│   ├── tables/  Reusable tabular widgets
│   └── shared/  Panels, charts, headers shared across pages
├── hooks/       TanStack-Query-backed hooks (one per logical view)
├── pages/       Thin page components — orchestrate hooks + widgets only
├── routes/      Declarative route table (path, title, Element)
├── schemas/     Entity shapes; ready to wrap in z.object() when Zod lands
├── services/    Facade over api/ — the only place transformers run
├── store/       Zustand for UI-only state (filters, pins, period)
├── utils/       constants · helpers · transformers (pure)
├── index.js     Barrel — preserves legacy named exports
└── README.md
```

### Layering rules

```
pages → hooks → services → api → core/data
                ↑
            transformers (pure, no React, no I/O)
```

- **pages** never import `api/` and never transform raw data. They orchestrate.
- **hooks** are the only thing that touches `@tanstack/react-query`.
- **services** are the only place that composes multiple `api/*` calls and
  applies transformers. Business logic lives here, not in components.
- **api/** modules return plain data, no React. Today they read from
  `core/data.js`; tomorrow they swap to `fetch()` without touching anything
  upstream.
- **store/** holds UI state only. Server-derived data goes in TanStack Query.

### Preserving the host contract

`core/helpers.jsx::DashboardRouter`, `App.jsx`, `core/menus.js`, and
`shell/BranchSwitcher.jsx` import named functions from `modules/<feature>`.
The barrel `index.js` re-exports the new page components under those exact
legacy names so nothing outside the feature folder needs to change:

```js
// modules/dashboard/index.js
export { BranchDashboardPage as Dashboard, BranchDashboardPage } from './pages/branch-dashboard';
export { DirectorDashboardPage as DirectorDashboard, DirectorDashboardPage } from './pages/director-dashboard';
// …etc
```

Vite resolves `import { Dashboard } from './modules/dashboard'` to the
directory's `index.js` once `dashboard.jsx` is deleted.

### Migrating the next module

To convert `modules/finance.jsx` (or any other single-file module):

1. `mkdir src/modules/finance/{api,components/{cards,tables,shared,forms,modals},hooks,pages,routes,schemas,services,store,utils}`
2. Move each named export into its own page file under `pages/`. Keep the
   export name identical (the host imports them by name).
3. Extract inline sub-components into `components/`.
4. Lift `useMemo`/`useState` computations into transformers or service
   functions. The page should only orchestrate hooks + widgets.
5. Create `<feature>.service.js` + matching `api/get-*.js` files.
6. Write `index.js` re-exporting page components under their legacy names.
7. Delete the old `modules/<feature>.jsx` file. Vite resolves the directory.
8. Run `npx vite build` to confirm no consumer broke.

See `src/modules/dashboard/README.md` for the worked example.

---

## 12. How to Add a New Screen

Follow these 5 steps in order (faster than v1 because module file is much smaller):

### Step 1 — Pick the right module file

Use the lookup table in [Section 7](#7-how-to-find-what) to find which module file your screen belongs in.

### Step 2 — Write the component in that file

Open the module file (e.g., `src/modules/finance.jsx`). Add the function at the bottom:

```jsx
export function MyNewScreen(){
  const [filter, setFilter] = useState("ALL");
  return (
    <PHASE2_Page title="My New Screen" subtitle="Description">
      <div style={cardStyle}>
        Hello world
      </div>
    </PHASE2_Page>
  );
}
```

Important: use `export function` so the screen can be imported into `App.jsx`.

### Step 3 — Add the import to `App.jsx`

Find the import line for your module and add the new component name:

```jsx
// Before
import { BankBalanceDashboard, TDSCalculator } from './modules/finance';

// After
import { BankBalanceDashboard, TDSCalculator, MyNewScreen } from './modules/finance';
```

### Step 4 — Wire the route in the `Page()` function

Inside `KB360App` in `App.jsx`, find the `Page()` function and add:

```jsx
if(route === "/finance/my-new-screen") return <MyNewScreen/>;
```

### Step 5 — Add to the menu

Find the relevant menu constant in `src/core/menus.js` (e.g., `MENU_FINANCE`) and add:

```jsx
{label:"My New Screen", href:"/finance/my-new-screen"},
```

### Verify

Run the parse check on the changed files:
```bash
node parse_check.js src/modules/finance.jsx
node parse_check.js src/App.jsx
node parse_check.js src/core/menus.js
```

All should report 0 diagnostics.

---

## 13. How to Add a New User Role

1. **Add to `ROLE_TEMPLATES`** in `src/core/permissions.js`. Specify `perms` for every module group.
2. **Add a role color** to the `roleColor` mapping in `src/shell/UserMenu.jsx` and `src/auth/LoginScreen.jsx`.
3. **Update `FULL_SCOPE_ROLES`** in `src/core/permissions.js` if the role has all-branch visibility.
4. **Test** by adding a user with that role to `_USERS_DATA` in `src/core/data.js`, then switching to them via the Login Screen.

---

## 14. Brand Assets & Design Tokens

### The pinwheel logo

- **Source files:** `public/kbiz360_appicon.png` (small, square) + `public/kbiz360_logo.png` (wide lockup)
- **Embedded inline:** As a base64 data URI in the `KBIZ_LOGO` constant in `src/core/brand.js` (~8.5 KB inline)
- **Usage:** `<img src={KBIZ_LOGO} alt="KBiz360" style={{width:32,height:32,borderRadius:7,...}}/>`
- **Sizes used:** 32×32 (TopBar), 54×54 (SignedOutScreen), 58×58 (LoginScreen header)
- **Always `borderRadius: 7-13`** — the icon has a dark rounded-square background

### Brand text treatment

| Context | Pattern |
|---|---|
| TopBar | `<span style={{color:"#d4a437"}}>KBiz</span>360` + grey "Smart Travel ERP" + tiny gold "THE BUSINESS ENGINE" |
| LoginScreen / SignedOutScreen | Similar but larger fonts |
| Footers, copyright | "KBiz360 v1.0 · THE BUSINESS ENGINE" or "Powered by KBiz360 — The Business Engine" |

### Travkings brand (operating company)

- **Text:** `<span style={{color:"#d4a437"}}>TRAV</span>KINGS` + maroon "Tours & Travels Pvt. Ltd."
- **Tagline:** "Crafting extraordinary journeys" / "IATA Accredited · Est. 2008"
- **Used in:** LoginScreen left panel, document headers/footers

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **AE** | Accounts Executive — Tier 4 maker role (branch-isolated) |
| **AMD** | Ahmedabad branch (India) |
| **BOM** | Mumbai branch (India) — largest operating branch |
| **BSP** | Billing & Settlement Plan (IATA airline ticket settlement) |
| **CGST/SGST/IGST** | Central/State/Integrated Goods & Services Tax (India) |
| **DMC** | Destination Management Company (local tour operator partner) |
| **GP** | Gross Profit |
| **GSTIN** | GST Identification Number (15-char alphanumeric) |
| **GSTR-1/GSTR-3B** | Monthly GST returns (outward supply / summary) |
| **HO** | Head Office function — shared services run out of the Mumbai (BOM) branch (no separate entity) |
| **IATA** | International Air Transport Association |
| **IRN** | Invoice Reference Number (e-invoice) |
| **ITC** | Input Tax Credit (GST) |
| **JV** | Journal Voucher |
| **MICE** | Meetings, Incentives, Conferences, Exhibitions |
| **PAN** | Permanent Account Number (10-char Indian tax ID) |
| **PNR** | Passenger Name Record (airline reservation) |
| **PT** | Professional Tax (state-level India) |
| **PV** | Payment Voucher |
| **RV** | Receipt Voucher |
| **SAC** | Services Accounting Code |
| **Sr. AE** | Senior Accounts Executive = Sughra (Tier 3 checker) |
| **Sr. FM** | Senior Finance Manager = Faiz (Tier 2 approver, CFO-equiv) |
| **TDS** | Tax Deducted at Source (India) |

---

## Quick-Reference Cheat Sheet for LLMs

```
TO MODIFY THE LOGIN SCREEN     → src/auth/LoginScreen.jsx
TO CHANGE BRAND COLORS         → src/core/brand.js + src/core/styles.js
TO ADD A USER                  → src/core/data.js (_USERS_DATA)
TO CHANGE PERMISSIONS          → src/core/permissions.js
TO REORDER THE SIDEBAR         → src/core/menus.js
TO ADD A SCREEN IN HR          → src/modules/hr.jsx
TO ADD A SCREEN IN TRANSACTIONS → src/modules/transactions.jsx
TO WIRE A NEW ROUTE            → src/App.jsx (Page function)

NEVER EDIT:                    src/main.jsx (entry point, leave alone)
NEVER ADD:                     localStorage, sessionStorage, React Router,
                               Redux, Tailwind, additional state libraries

ALWAYS USE:                    inline styles, useState/useEffect hooks,
                               PHASE2_Page wrapper for new screens,
                               cardStyle/RPT_thStyle from core/styles.js

PARSE CHECK:                   node parse_check.js <file>
BUILD:                         npm run build
LOCAL DEV:                     npm run dev
```

---

**Document maintained as `PROJECT_CONTEXT.md` in the project root.** When making non-trivial changes to the codebase, update this file in the same commit.

For full operational documentation (user-facing manual), see `docs/KBiz360_User_Manual.pdf` (46 pages).
