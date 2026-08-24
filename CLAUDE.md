# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A compact German travel-expense app ("Reisekosten") for a small team (~10 employees). Next.js App Router + TypeScript + Prisma/SQLite (Postgres planned later), server actions, local receipt storage on disk. Deployed under a sub-path (`/Reisekosten`) behind Caddy at `apps.purelink.de`.

## Commands

```bash
npm run dev              # prisma generate + next dev (port 3000)
npm run dev:platform     # prisma generate + next dev on port 3010 (matches Caddy reverse_proxy config)
npm run build            # prisma generate + next build
npm run typecheck        # tsc --noEmit
npm run prisma:validate  # prisma validate
npm test                 # runs all tests in tests/*.test.ts via node's built-in test runner
npm run test:calculation # runs only tests/calculation.test.ts
npm run db:studio        # prisma studio
```

Run a single test file directly:

```bash
node --experimental-strip-types --test tests/per-diem.test.ts
```

Tests are plain `node:test` files (no Jest/Vitest) under [tests/](tests/), one file per `src/lib/*.ts` module they exercise — e.g. [tests/calculation.test.ts](tests/calculation.test.ts) tests [src/lib/calculation.ts](src/lib/calculation.ts).

Initial DB setup (creates SQLite db, runs migrations, seeds test users):

```bash
npm run setup   # prisma validate && prisma generate && prisma migrate dev --name init && prisma db seed
```

On Windows, `SETUP.cmd` / `STARTEN.cmd` wrap the above and work from UNC network paths via `pushd`. `PRISMA-REPARIEREN.cmd` fixes the `@prisma/client did not initialize yet` error by regenerating the client.

## Rules from AGENTS.md (project conventions)

- Do not swap out the existing stack without explicit approval; avoid adding new libraries when the task is solvable without them.
- `prisma` CLI and `@prisma/client` versions must always match (currently 6.16.2).
- Only change the Prisma schema when strictly necessary, and explain which tables/fields a migration touches before running it. **Never run `prisma migrate reset`.**
- After any change, run `npm run typecheck`, `npx prisma validate`, and `npm run build`.
- Don't remove existing functionality; keep changes small and traceable.
- UI text is German; currency is formatted as de-DE / EUR.
- Never call a demo feature production-ready.

## Architecture

**Route groups**: `src/app/(app)/*` holds all authenticated pages (dashboard, reports, review, archive, users, settings, allowances) sharing `(app)/layout.tsx`. `src/app/login` is the public login page. API routes under `src/app/api/*` handle file downloads, PDF generation, and receipt OCR analysis — everything else is done via server actions/components directly, not REST endpoints.

**Base path**: the whole app is served under `/Reisekosten` (configurable via `NEXT_PUBLIC_BASE_PATH`, see [next.config.ts](next.config.ts) and [src/lib/paths.ts](src/lib/paths.ts)). Always build internal links with `withBasePath()` rather than hardcoding paths.

**Auth**: custom cookie-based session in [src/lib/auth.ts](src/lib/auth.ts) — bcrypt password hashes, a JWT (jose) stored in an httpOnly cookie (`reisekosten_session`), no external auth library. `requireUser()` redirects to `/login` when unauthenticated. Roles are `EMPLOYEE`, `APPROVER`, `ADMIN` (see `Role` enum in [prisma/schema.prisma](prisma/schema.prisma)); role-gating logic (e.g. who can complete a report) lives in small pure functions like [src/lib/report-workflow.ts](src/lib/report-workflow.ts), not scattered inline checks.

**Data model** ([prisma/schema.prisma](prisma/schema.prisma)): `User` → `ExpenseReport` (1:N) → `ExpenseItem` (1:N, cascade delete) and `ReviewComment` (1:N, cascade delete). `ReportStatus` moves through `DRAFT → SUBMITTED → RETURNED/APPROVED → COMPLETED`. `ReportNumberSequence` generates the yearly, sequential `processNumber` (see [src/lib/process-number.ts](src/lib/process-number.ts)). `AppSetting` is a generic key/value store for app-wide settings (see [src/lib/settings.ts](src/lib/settings.ts)).

**Money/calculation logic is centralized and pure** in [src/lib/calculation.ts](src/lib/calculation.ts) (per-diem meal allowances, lodging, mileage, reimbursement totals) and [src/lib/per-diem.ts](src/lib/per-diem.ts) / [src/lib/per-diem-rates-2026.ts](src/lib/per-diem-rates-2026.ts) (country-specific BMF per-diem rates). These take plain data in and return plain numbers out — no DB/Prisma calls inside — which is what makes them directly unit-testable via `node:test`. Follow that pattern for new financial logic rather than embedding calculations in server actions.

**Receipts/files**: uploads are validated and stored on disk (not in the DB) via [src/lib/storage.ts](src/lib/storage.ts) (`UPLOAD_DIR`, default `./storage/uploads`); the DB only stores `storedFileName`/`originalFileName`/`mimeType` on `ExpenseItem`. Receipt OCR uses `tesseract.js` + `@napi-rs/canvas` + `pdfjs-dist` ([src/lib/receipt-recognition.ts](src/lib/receipt-recognition.ts), [src/lib/receipt-entry.ts](src/lib/receipt-entry.ts)) to pre-fill expense fields from an uploaded image/PDF. PDF report generation uses `pdf-lib` ([src/lib/report-pdf.ts](src/lib/report-pdf.ts), [src/lib/pdf-rendering.ts](src/lib/pdf-rendering.ts)). These packages are listed in `serverExternalPackages` in [next.config.ts](next.config.ts) so Next doesn't try to bundle them.

**Report editing/workflow**: [src/lib/report-editing.ts](src/lib/report-editing.ts) and [src/lib/report-workflow.ts](src/lib/report-workflow.ts) hold the rules for what edits/transitions are allowed at each status, kept separate from the page components in `src/app/(app)/reports/`.

## Environment

Copy `.env.example` to `.env`: `DATABASE_URL` (SQLite file), `AUTH_SECRET` (JWT signing key — must be replaced for any real deployment), `UPLOAD_DIR`, `NEXT_PUBLIC_BASE_PATH`.
