# Finance feature

Mirrors the canonical `modules/dashboard` layout. Being migrated off the
1900-line monolith (now `legacy.jsx`) one screen at a time — the strangler-fig
pattern. The barrel (`index.js`) re-exports legacy + migrated screens under their
original names, so `App.jsx`, `transactions.jsx` and `taxation.jsx` import from
`modules/finance` with zero changes during the migration.

```
finance/
├── api/         # data accessors — one verb per file (apiGet, no transforms)
├── components/  # cards / tables / shared / forms (feature-local UI)
├── hooks/       # one TanStack-Query hook per view (the only react-query touchpoint)
├── pages/       # thin pages — orchestrate hook + store + DataTable only
├── routes/      # financeRoutes — declarative table mounted by the host router
├── schemas/     # entity shapes (zod-ready)
├── services/    # the only place api/* is composed + transformers run
├── store/       # zustand — UI-only state (period, view); never server data
├── utils/       # pure transformers/helpers
├── legacy.jsx   # the original monolith — shrinks as screens migrate out
└── index.js     # barrel (legacy + migrated, original names)
```

Layering: `pages → hooks → services → api → core/api → backend`.

## Migration status

| Screen | Status | Route | Data source |
| --- | --- | --- | --- |
| **Trial Balance** | ✅ migrated | `/finance/trial-balance` | LIVE `GET /api/accounting/trial-balance` |
| Bank Reconciliation | ⏳ legacy | `/bank-reco` | live (core/useBankReco) |
| Day Book | ⏳ legacy | `/day-book` | — |
| Ledger A/c | ⏳ legacy | `/ledger` | — |
| Year-End Close, Loans, Investments, Calculators, … | ⏳ legacy | various | mixed |

> The legacy `TrialBalanceLegacy` (in `legacy.jsx`) computed a fake trial balance
> from seed data with invented ratios. The migrated page reads the real
> double-entry books. It mounts at `/finance/trial-balance` and will take over
> the canonical `/trial-balance` path (currently `accountingLive::TrialBalanceLive`)
> once it reaches feature parity (Excel export, print, ledger drill-down).

## Next screen to migrate

Follow the same vertical slice: `api/get-*.js` → `services/finance.service.js`
→ `hooks/use-*.js` → `pages/<screen>.jsx` (DataTable + zustand UI state) →
add to `routes/index.jsx` → explicit re-export in `index.js` → delete the dead
component from `legacy.jsx`.
