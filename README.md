# KBiz360 — Smart Travel ERP

**The Business Engine** powering Travkings Tours & Travels Pvt. Ltd.

Multi-branch, multi-currency, role-controlled ERP covering Accounting, Operations, Finance, Reports, Taxation, HR & Payroll, Masters, HO Control, and Settings across 6 entities in 4 countries (India, Kenya, Tanzania, DR Congo).

> **🆕 v2.0:** The codebase has been refactored from a monolithic single-file architecture into a **clean 34-file modular structure** for maintainability and LLM-friendly editing. See [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) for the full architectural guide.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js 20+** (see `.nvmrc`)
- **npm 10+** or **yarn 1.22+**

### Install & Run

```bash
npm install        # install dependencies
npm run dev        # start dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

---

## 📁 Project Structure (Modular v2.0)

```
kbiz360-app/
├── PROJECT_CONTEXT.md            ⭐ FULL ARCHITECTURE GUIDE (read this first)
├── README.md                     This file
├── DEPLOY_AWS.md                 AWS deployment options & scripts
│
├── public/                       Static assets
│   ├── kbiz360_appicon.png       Favicon + apple-touch-icon
│   └── kbiz360_logo.png          Wide brand lockup
│
├── src/                          Source code — fully modular (34 files)
│   ├── App.jsx                   Root component (384 lines)
│   ├── main.jsx                  React entry point
│   │
│   ├── core/                     Shared utilities (10 files)
│   │   ├── brand.js              KBIZ_LOGO base64 PNG
│   │   ├── data.js               BRANCHES, _USERS_DATA, sample data
│   │   ├── permissions.js        ROLE_TEMPLATES, canAccessModule
│   │   ├── menus.js              MENU_*, getMenu(), MENU_TO_GROUP
│   │   ├── format.js             fmtINR, fmtDate
│   │   ├── hooks.js              useMobile, useNotifRefresh
│   │   ├── styles.js             cardStyle, KPICard, RPT_thStyle
│   │   ├── voucher-print.js      HTML voucher template
│   │   ├── business-logic.js     Cross-cutting business helpers
│   │   └── helpers.js            Small misc utilities
│   │
│   ├── shell/                    App chrome (9 files)
│   │   ├── TopBar.jsx
│   │   ├── SideNav.jsx
│   │   ├── UserMenu.jsx
│   │   ├── BranchSwitcher.jsx
│   │   ├── UserSwitcher.jsx
│   │   ├── NotifPanel.jsx
│   │   ├── PHASE2_Page.jsx
│   │   ├── Placeholder.jsx
│   │   └── GlobalSearch.jsx
│   │
│   ├── auth/                     Login/logout (2 files)
│   │   ├── LoginScreen.jsx
│   │   └── SignedOutScreen.jsx
│   │
│   └── modules/                  Business modules (11 files)
│       ├── dashboard.jsx         Role-specific dashboards
│       ├── transactions.jsx      Sales, Purchase, Receipts, Payments
│       ├── operations.jsx        Bookings, itineraries, passports
│       ├── finance.jsx           Bank, TDS, Treasury, Reconciliation
│       ├── reports.jsx           P&L, GP, Yield analysis, Custom builder
│       ├── taxation.jsx          GSTR, VAT, Form 16, TDS
│       ├── hr.jsx                Employee master, payroll, self-service
│       ├── masters.jsx           Customer, Supplier, CoA, Currency
│       ├── ho-control.jsx        Group dashboard, vendor lock, audit
│       ├── assets.jsx            Fixed asset register, depreciation
│       └── settings.jsx          Doc templates, branding, permissions
│
├── docs/
│   └── KBiz360_User_Manual.pdf   46-page user manual
│
├── scripts/
│   ├── deploy-s3.sh              S3 + CloudFront one-command deploy
│   └── deploy-amplify.sh         Amplify CLI deploy helper
│
├── index.html                    Page shell + brand metadata
├── package.json                  Dependencies (React 18, Vite 5)
├── vite.config.js                Build config with code-splitting
├── amplify.yml                   AWS Amplify build spec
└── .nvmrc                        Node version (20)
```

### Why this structure?

The original 28,500-line `App.jsx` has been split into 34 focused files. Each module is its own file — typically 500-4,500 lines — making it easy for both developers and LLMs to navigate and edit:

| Task | Old context | New context | Reduction |
|---|---|---|---|
| Edit a HR screen | 28,500 lines | ~2,200 lines | **13× smaller** |
| Fix a TDS bug | 28,500 lines | ~1,900 lines | **15× smaller** |
| Update the login screen | 28,500 lines | ~320 lines | **89× smaller** |
| Change brand colors | 28,500 lines | ~1,200 lines | **24× smaller** |

See **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)** — Section 7 — for the complete "Where do I find X?" lookup table.

---

## 🎯 Tech Stack

- **Build:** Vite 5 + esbuild minification
- **Framework:** React 18 (Strict Mode)
- **Icons:** lucide-react
- **Charts:** Recharts
- **Styling:** Inline styles (no CSS framework dependency)
- **State:** React hooks (no Redux)
- **Routing:** Simple string match in `App.jsx` (no React Router)
- **Backend:** None — pure UI with embedded sample data

---

## 🔐 Default Demo Login

The app starts with a **Login Screen** showing both Travkings and KBiz360 branding:

1. **Type any email** and click "Sign In"
2. **Click any of the 4 quick-access tiles** (Director, Sr. FM, Sr. AE, Branch AE)
3. **Expand "Show all 9 accounts"** to pick any user

| Role | Name | Branch Access |
|---|---|---|
| Super Admin | AD | All 6 |
| Director | Afshin Dhanani | All 6 |
| Sr. Finance Manager | Faiz Patel | All 6 |
| Sr. Accounts Executive | Sughra Sayed | All 6 |
| Accounts Executive | Rohan / Mohan / Mujeet / Rujeet / Sujeet | Single branch only |

---

## 🌐 AWS Deployment

Three deployment options are documented in [`DEPLOY_AWS.md`](DEPLOY_AWS.md):

1. **AWS Amplify** (recommended) — easiest, git-connected CI/CD, free tier
2. **S3 + CloudFront** — most cost-effective for static SPAs (~$1-3/month)
3. **Elastic Beanstalk** — for future server-side capabilities

```bash
bash scripts/deploy-s3.sh         # Build & deploy to S3 + invalidate CloudFront
bash scripts/deploy-amplify.sh    # Initialize Amplify
```

---

## 📖 Documentation

- **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)** — Complete architecture guide for LLMs/developers (15 sections, 644 lines)
- **[`DEPLOY_AWS.md`](DEPLOY_AWS.md)** — AWS deployment options & runbook
- **`docs/KBiz360_User_Manual.pdf`** — 46-page end-user manual

---

## 🛠️ Developer Workflow

### Adding a new screen

1. Use `PROJECT_CONTEXT.md` Section 7 to find which module file owns it
2. Open ONLY that file (typically 500-4,500 lines)
3. Write `export function MyScreen(){...}`
4. Import in `App.jsx`, wire route in `Page()` function
5. Add menu entry in `src/core/menus.js`

### Editing an existing screen

1. Find the file via the lookup table in `PROJECT_CONTEXT.md`
2. Open that file alone (no need to load the whole codebase)
3. Edit, parse-check, commit

### Code conventions

- Inline styles only (no Tailwind/CSS files)
- `export function ComponentName(){}` for components
- `cardStyle`, `RPT_thStyle`, `inpStd` from `core/styles.js`
- Touch targets ≥44px (top) or ≥40px (sub)
- Use `useMobile()` from `core/hooks.js` for responsive layouts

---

## 🏢 About

**Travkings Tours & Travels Pvt. Ltd.**
IATA Accredited · Est. 2008 · GST 27AAACT1234A1ZF · Mumbai, India

For support or access requests: `ad@travkings.com`

---

© 2026 Travkings Tours & Travels Pvt. Ltd. · All rights reserved.
