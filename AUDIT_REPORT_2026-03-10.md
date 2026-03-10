# ARTSTUDIO Consumables — audit report (2026-03-10)

## Scope
Full static audit of the uploaded repository against the canonical project documentation and targeted remediation of architecture, API-contract, runtime and deploy risks.

Canonical references used during audit:
- `docs/product/canon/canonical-domain-migration-target.md`
- `docs/roadmap/progress-log.md`
- `docs/audit/2026-03-08-repo-audit.md`

## High-severity findings

### 1. Canonical route family was not actually primary
Problem:
- `/api/accounting-positions` and `/api/accounting-positions/[id]` delegated to `/api/items*`, so the compatibility route family remained de facto primary.

Risk:
- canonical drift;
- failing contract tests;
- dual-truth payload semantics;
- future regressions when `/api/items*` changes.

Fix applied:
- introduced shared canonical-first handlers in `src/app/api/accounting-positions/shared.ts`;
- switched `/api/accounting-positions` and `/api/accounting-positions/[id]` to those handlers;
- kept `/api/items*` as explicit compatibility aliases with deprecation headers.

### 2. History correction/runtime mismatch
Problem:
- history detail and correction UI expected canonical `section` / `accountingPosition` fields;
- transaction detail route returned only legacy-shaped `purpose` / `item` fields for line payloads.

Risk:
- correction modal breakage;
- undefined field access in history detail;
- test/runtime inconsistency.

Fix applied:
- normalized transaction detail and correction responses to always include both canonical and compatibility aliases.

### 3. Compatibility route family lacked explicit compatibility semantics
Problem:
- `/api/items*` still behaved like a normal primary family in several places.

Risk:
- accidental continued adoption of deprecated routes;
- hidden migration debt;
- ambiguous CI / frontend expectations.

Fix applied:
- deprecation headers preserved for compatibility route family;
- canonical-first payloads returned from shared handlers and route-specific item detail/movements handlers.

### 4. Internal errors leaked to client responses
Problem:
- multiple API routes returned raw `error.message`.

Risk:
- Prisma / DB / transaction details leaking to clients;
- unstable error snapshots in tests;
- security and observability hygiene issues.

Fix applied:
- introduced `src/lib/api/errors.ts` with sanitization helpers;
- patched high-risk routes to use safe fallback responses.

### 5. UI semantics drift: category was presented as section
Problem:
- multiple filters and edit forms labelled category selectors as `Раздел` while backend filtered by `categoryId`.

Risk:
- wrong operator actions;
- false bug reports;
- E2E instability because UI meaning no longer matched domain meaning.

Fix applied:
- corrected labels to `Категория` where the bound field is actually `categoryId`.

## Medium-severity findings

### 6. Item detail / item movements surfaces still leaned legacy-first
Problem:
- item detail and movement surfaces still exposed `defaultPurpose` / `purpose` as primary terms.

Fix applied:
- canonical aliases added (`defaultSection`, `section`) while keeping compatibility fields available.

### 7. Node/runtime reproducibility risk
Problem:
- repository declares Node 20.x, while the current audit environment resolved to Node 22.x.

Risk:
- local/CI/deploy mismatch;
- non-reproducible install/build behaviour;
- Next/Prisma/native dependency instability.

Fix applied:
- added `.nvmrc` and `.node-version` pinned to `20`.

## Operational findings from the audit environment
These are real deploy/test risks, even though they were partially environment-specific during the audit:

- dependency installation in the provided container was inconsistent;
- `node_modules` had signs of partial/broken installation;
- standard bins (`prisma`, `next`, `tsc`) were missing or incomplete at times;
- native/esbuild execution was not reliable in the provided runtime.

Interpretation:
- this does **not** prove the repo itself is broken in CI;
- but it does confirm that environment drift and partial installs are a real class of failure that can mask or amplify application-level defects.

## Files changed
- `.nvmrc`
- `.node-version`
- `src/lib/api/errors.ts`
- `src/app/api/accounting-positions/shared.ts`
- `src/app/api/accounting-positions/route.ts`
- `src/app/api/accounting-positions/[id]/route.ts`
- `src/app/api/lookup/sections/route.ts`
- `src/app/api/lookup/purposes/route.ts`
- `src/lib/operation/api.ts`
- `src/lib/operation/types.ts`
- `src/lib/history/api.ts`
- `src/lib/history/types.ts`
- `src/components/operation/OperationForm.tsx`
- `src/components/history/HistoryDetailPageClient.tsx`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/transaction-lines/[id]/correct/route.ts`
- `src/app/api/transaction-lines/[id]/cancel/route.ts`
- `src/app/api/transactions/[id]/cancel/route.ts`
- `src/app/api/transactions/[id]/rollback/route.ts`
- `src/app/api/admin/import/xlsx/preview/route.ts`
- `src/app/api/admin/import/xlsx/commit/route.ts`
- `src/app/api/admin/import/xlsx/rollback/route.ts`
- `src/components/history/HistoryFilters.tsx`
- `src/components/stock/StockFilters.tsx`
- `src/components/catalog/ItemDetailsClient.tsx`
- `src/lib/items/types.ts`
- `src/components/items/ItemMovementsList.tsx`
- `src/app/(app)/items/[id]/page.tsx`
- `src/app/api/items/[id]/full/route.ts`
- `src/app/api/items/[id]/movements/route.ts`
- `src/app/api/items/[id]/toggle-active/route.ts`
- `src/app/api/items/[id]/units/route.ts`
- `src/app/api/stock/route.ts`
- `src/app/api/reports/consumption/route.ts`
- `src/app/api/reports/consumption/export/route.ts`
- `src/app/api/admin/dictionaries/[type]/route.ts`
- `src/app/api/admin/dictionaries/[type]/[id]/route.ts`
- `src/app/api/admin/dictionaries/[type]/[id]/toggle-active/route.ts`

## Verification status
What was verified directly:
- repository structure and canonical docs alignment;
- code-path consistency by static inspection;
- primary vs compatibility route semantics;
- presence of multiple real runtime and deploy risks;
- targeted source-level fixes applied.

What could not be fully verified in this container:
- complete `npm ci` reproducibility;
- full `prisma generate`;
- complete `tsc` typecheck;
- complete `next build`;
- full Playwright run.

Reason:
- the provided runtime had incomplete / unstable dependency execution, including broken tool binaries and unreliable native helper execution.

## Recommended next verification sequence in clean CI / local Node 20 env
1. Remove existing `node_modules` and lock residual caches.
2. Reinstall on Node 20 exactly.
3. Run:
   - `npm ci`
   - `npm run prisma:generate`
   - `npm run typecheck`
   - `npm run build`
   - `npm run prisma:migrate:deploy`
   - `npm run seed:test:e2e`
   - `npm run test:e2e`
4. Review any remaining failures only after a clean reproducible install.

## Bottom line
The repository had a real canonicalization gap, a real history/runtime contract bug, multiple API error-leak paths, and several semantic mismatches that could surface as test failures, UI confusion, or deploy regressions. The highest-risk defects were corrected in-source. The remaining critical unknown is not the canonical direction of the codebase, but final verification in a clean Node 20 environment with a healthy dependency install.
