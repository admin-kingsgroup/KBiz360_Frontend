# Dashboard feature

Canonical feature-folder layout for the KBiz360 codebase. The remaining
modules (`finance`, `transactions`, `masters`, …) should mirror this
structure exactly when they are migrated off the monolithic single-file
pattern.

```
dashboard/
├── api/         # data accessors — one verb per file (get-*, create-*, …)
├── components/
│   ├── cards/   # KPI / stat cards
│   ├── tables/  # reusable tabular widgets
│   └── shared/  # panels, charts, headers used by multiple pages
├── hooks/       # one TanStack-Query-backed hook per logical view
├── pages/       # thin page components — orchestrate hooks + widgets only
├── routes/      # declarative route table (path, title, lazy Element)
├── schemas/     # entity shapes; ready to wrap in z.object() when zod lands
├── services/    # facade over api/ — only place transformers run
├── store/       # zustand stores for UI-only state (filters, pins, period)
├── utils/       # constants, helpers, transformers
├── index.js     # barrel — preserves legacy named exports
└── README.md
```

## Layering rules

```
pages → hooks → services → api → core/data
                ↑
            transformers (pure)
```

* **pages** never import from `api/` or transform raw data. They orchestrate.
* **hooks** are the only thing that touches `@tanstack/react-query`. They call
  one service function and (optionally) derive memoised values from its result.
* **services** are the only place that knows how to compose multiple `api/*`
  calls and apply transformers. Business logic lives here, not in components.
* **api/** modules return plain data, no React. Today they read from
  `core/data.js`; tomorrow they swap to `fetch()` without touching anything
  upstream.
* **utils/transformers.js** is pure — no React, no I/O. Easy to unit-test.

## Contract preserved by `index.js`

`core/helpers.jsx::DashboardRouter` imports six named identifiers from this
feature. The barrel re-exports the page components under those exact names
so nothing outside this folder needed to change:

| Legacy name          | New page component        |
| -------------------- | ------------------------- |
| `Dashboard`          | `BranchDashboardPage`     |
| `DirectorDashboard`  | `DirectorDashboardPage`   |
| `SrFmDashboard`      | `SrFmDashboardPage`       |
| `SrAeDashboard`      | `SrAeDashboardPage`       |
| `AcctsExecDashboard` | `AcctsExecDashboardPage`  |
| `HrMgrDashboard`     | `HrMgrDashboardPage`      |

Page props (`{ branch, setRoute, currentUser }`) are unchanged.

## Server state vs UI state

* **Server state** (bills, KPIs, top customers, …) → TanStack Query, keyed by
  `['dashboard', <role>, …]`. Never put this in zustand.
* **UI state** (selected period, pinned widgets, compare-LY toggle) →
  `useDashboardStore` in `store/dashboard.store.js`.

## Adding a Zod schema

`zod` is not installed yet. When it is:

```js
// schemas/dashboard.schema.js
import { z } from 'zod';

export const billSchema = z.object({
  id: z.string(),
  branch: z.string(),
  date: z.string(),
  mod: z.enum(['Flight', 'Holiday', 'Hotel', 'Visa', 'Car', 'Insurance', 'Misc']),
  consultant: z.string(),
  sell: z.number(),
  cost: z.number(),
});
```

The existing `make*` factory shapes are intentionally aligned with the seed
data so the migration is mechanical.

## Adding forms (react-hook-form + Zod)

Dashboard pages are read-only. When a feature needs a form, place it under
`components/forms/<entity-name>-form.jsx` and follow the canonical pattern:

```jsx
const form = useForm({ resolver: zodResolver(entitySchema) });
const onSubmit = form.handleSubmit(useCreateEntity().mutateAsync);
```

* `useCreateEntity` lives in `hooks/use-create-entity.js` and wraps `useMutation`.
* The mutation calls `services/<feature>.service.js::createEntity(input)`.
* The service calls `api/create-entity.js`.

## Routing

`routes/index.jsx` exports `dashboardRoutes` — a declarative array of
`{ path, title, moduleName, Element }`. `Element` is a `lazy()` page, so each
role view ships as its own JS chunk.

When `react-router-dom` is adopted, `App.jsx` can replace its string-matching
`Page()` function with a `createBrowserRouter(dashboardRoutes)` call. Until
then, the host can iterate the array to power its existing string-match.

## Replicating to other modules

To convert `modules/finance.jsx` next:

1. `mkdir src/modules/finance/{api,components/{cards,tables,shared,forms,modals},hooks,pages,routes,schemas,services,store,utils}`
2. Move each named export from `finance.jsx` into its own page file under
   `pages/`. Keep the export name identical.
3. Extract any inline sub-components into `components/`.
4. Move all `useMemo`/`useState` computations into transformers or service
   functions. The page should only orchestrate.
5. Create one `<feature>.service.js` and the matching `api/get-*.js` files.
6. Write `index.js` re-exporting page components under their legacy names.
7. Delete `modules/finance.jsx`. Vite resolves the directory's `index.js`.
