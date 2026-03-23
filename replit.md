# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── risk-calculator/    # Trading Risk Calculator (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
  - `src/routes/health.ts` — `GET /api/health`
  - `src/routes/auth.ts` — `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`
  - `src/routes/trades.ts` — `GET/POST/PATCH/DELETE /api/trades` (scoped by user when authenticated)
  - `src/routes/sheets.ts` — `POST /api/sheets/sync` (Google Sheets sync)
- Libs:
  - `src/lib/jwt.ts` — JWT sign/verify, authMiddleware, optionalAuth
  - `src/lib/telegram.ts` — Telegram Bot API notifications (new trade, close trade, update)
  - `src/lib/googleSheets.ts` — Google Sheets sync via Replit connector (create/update "Trading Journal" spreadsheet)
- Depends on: `@workspace/db`, `@workspace/api-zod`, googleapis, bcryptjs, jsonwebtoken

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — table definitions:
  - `usersTable` — id, email, name, password_hash, google_id, avatar_url, timestamps
  - `tradesTable` — id, user_id (FK → users), trade fields, timestamps
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/risk-calculator` (`@workspace/risk-calculator`)

Trading Risk Calculator web app (React + Vite + Tailwind). A comprehensive Indian market trading toolkit.

**Features:**
- **Equity Calculator** — position sizing with leverage, risk %, stop loss/target, Indian charges (STT, SEBI, GST, stamp duty)
- **Options Calculator** — stock & index options, Black-Scholes Greeks (Delta, Gamma, Theta, Vega), lot-based sizing
- **Futures Calculator** — margin-based sizing for NSE F&O with margin utilization gauge
- **Trading Journal** — full CRUD (Add/Edit/Delete/Close trade) backed by `/api/trades` REST API + CSV export + Google Sheets sync
- **Performance Dashboard** — Recharts analytics: cumulative P&L, daily P&L bar chart, weekly win rate trend, instrument pie chart
- **Authentication** — email/password registration & login with JWT; Google OAuth ready
- **Telegram notifications** — trade alerts sent via Telegram Bot API on create/close/update
- **Google Sheets sync** — one-click sync of all trades to a Google Sheet via Replit connector
- **5 color themes** — rose (default), cyan, emerald, violet, amber; applied via `data-theme` on `<html>`
- **Help Guide** — inline glossary for all calculator fields and Indian market charges

**Key files:**
- `src/App.tsx` — wouter routing (/, /login, /equity, /options, /futures, /journal, /dashboard)
- `src/contexts/AuthContext.tsx` — auth state provider
- `src/lib/auth.ts` — login, register, Google auth, token management
- `src/pages/AuthPage.tsx` — login/register UI
- `src/index.css` — all 5 themes as `[data-theme]` CSS custom properties
- `src/lib/charges.ts` — Indian market charge calculations
- `src/lib/optionsCalculator.ts` — Black-Scholes Greeks
- `src/components/RiskCalculator.tsx` — main shell with tab nav

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `JWT_SECRET` — secret for signing JWT tokens
- `TELEGRAM_BOT_TOKEN` — Telegram bot token for trade notifications
- `TELEGRAM_CHAT_ID` — Telegram chat ID for notifications
- Google Sheets — connected via Replit integration (uses `REPLIT_CONNECTORS_HOSTNAME`)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
