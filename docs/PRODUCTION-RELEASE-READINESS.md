# Production Release Readiness — Pokopia Funnel

Status: **BLOCKED pending explicit production approvals**
Scope: pre-production packet only; no production systems were changed.
Date: 2026-09-21

## Release candidate

- Approved commit: `b8f9f11f8041b9e35b470c54f6faacb613ff78c8`
- Preview: <https://sugarfield-studios-73ibghslp-superlativeinvest-2944s-projects.vercel.app>
- Vercel deployment: `dpl_Beh5W4nGNgCkA3MogHPzRhCXeHpp`
- Vercel target/status: `preview` / `Ready`
- Staging Supabase project: `faxsnbdjzniwyhtnsvfz`
- Stripe environment used by staging: Test Mode

### Verification evidence

| Check | Result | Evidence |
|---|---|---|
| `npm.cmd run staging:check` | PASS | Staging Supabase, test Stripe key, migration, and Preview target validated |
| `npm.cmd run typecheck` | PASS | Passed after the build regenerated local Next type artifacts |
| `npm.cmd run lint` | PASS with warning | One pre-existing unused `join` import in `scripts/create-p16-v3-and-p18-v4-manifests.mjs` |
| `npm.cmd test` | PASS | 36/36 tests |
| `npm.cmd run build` | PASS | Next production build completed |
| PDF delivery audit | PASS | 43/43 inventory entries found, downloaded, and valid |
| PDF rendering | PASS | 43/43 render checks completed |
| Authenticated downloads | PASS | Authorized P06, P16, P18, and bundled P13 files produced signed URLs |
| Unauthorized download | PASS | App-level `401`; no signed URL generated |

The committed diff contains no literal live Stripe keys, webhook secrets, service-role keys, or private-key material. Untracked local QA/source artifacts remain outside the release candidate and must not be packaged.

## Additive migration readiness

Migration under review: `supabase/migrations/202609190001_add_pokopia_accumulated_order.sql`

The migration is additive-only. It adds `selected_products`, checkout fingerprint/version fields, P18/P17 state, and canonical order `line_items`. Legacy tier and checkout columns remain intact and are not the authoritative representation for new checkout. No production backup, migration, row rewrite, or reinterpretation has been performed.

### Approved production runbook (later window)

1. Record Data and Release approval and take a restorable production snapshot.
2. Verify the snapshot is complete and identify its timestamp/retention ID.
3. Apply the migration through the production Supabase change process.
4. Validate columns, defaults, constraints, and row counts; confirm legacy columns remain unchanged.
5. Record migration timestamp and operator.
6. If validation fails, stop traffic changes and use the documented non-destructive rollback guidance; do not drop legacy columns or delete rows.

## Storage and fulfillment readiness

Production storage promotion and read-only audit on 2026-09-22 passed. See `docs/PRODUCTION-STORAGE-AUDIT-20260922.md`: all 33 required P06, legacy P16, P13, P17, and P18 objects exist in the private bucket and hash-match. P13/P18 were promoted under new non-`STAGED` prefixes; application mappings are prepared but production deployment remains gated.

Before activation, Data/Engineering/Security must verify:

- production private bucket and object hashes match the approved manifests;
- P13 remains standalone and has no funnel/cart role;
- signed URLs are issued only from the production private bucket;
- `deliveryMapStatus` changes only in the approved production window.

## Environment and Stripe readiness

Production configuration remains unchanged. Before release, inventory and validate:

- production Supabase URL, anon key, and service-role key;
- live Stripe secret and webhook secret;
- live canonical prices for P06, P16, P17, and P18;
- live webhook endpoint and signing secret;
- absence of test keys or test price IDs in production.

The production checkout acceptance criteria remain one final Checkout Session, one canonical line item per selected paid product, no duplicates, and server-owned prices/metadata.

## Security and smoke-test plan

### Staging security gate

**APPROVED (2026-09-24, requester):** staging authorization checks passed. Evidence includes app-level unauthenticated download `401`, wrong-customer order `403`, non-entitled product `403`, direct P18/P17 guards, double-skip precedence, and client-only eligibility rejection. This approval is limited to the staging Preview/local staging environment and does not authorize production security testing or deployment.

Run only with a controlled internal account and approved payment method after Security, Payments, and Release approval:

- unauthenticated download → `401`;
- wrong-customer order → `403`/`404`;
- non-entitled product → `403`;
- direct unqualified P18/P17 access rejected;
- double-skip bypasses P18/P17 and checkout;
- client price, total, SKU, route, fingerprint, and eligibility fields ignored;
- full P06/P16/P18 checkout and P18-skip/P17 checkout;
- webhook fulfillment and retry idempotency;
- Library and Order authorized downloads;
- Mini Tool → Companion redirect;
- zero-item checkout → Complete without a Stripe call;
- checkout retry/session reuse.

## Observability and rollback packet

Before any production deployment, record:

- deployment ID and migration timestamp;
- incident owner and escalation channel;
- alerts for checkout creation, webhook failures, fulfillment failures, and download errors;
- stop conditions for auth, payment, or entitlement regressions;
- previous production deployment retained for rollback;
- non-destructive migration rollback guidance (no destructive column/data removal).

## Approval gates

### Recorded approvals

- **Product — APPROVED (2026-09-21):** routes, copy, pricing, and BUY/SKIP behavior approved by the requester.
- **Engineering — APPROVED (2026-09-21):** release-candidate diff review and regression evidence accepted for progression to the remaining gates.
- **Data — APPROVED (2026-09-24, requester):** the encrypted external dump was verified, and the additive migration readiness evidence was approved. The migration dry-run against production listed only `202609190001_add_pokopia_accumulated_order.sql`; it was not applied.

| Gate | Required evidence | Status |
|---|---|---|
| Product | Routes, copy, prices, BUY/SKIP behavior | **Approved** |
| Engineering | Diff review and regression results above | **Approved** |
| Data | Backup/snapshot and additive migration validation | **Approved**; encrypted external dump and production dry-run verified |
| Storage | Production objects and hashes | **PASS**; 33/33 hash-matched |
| Payments | Live prices, webhook, checkout, fulfillment | **Blocked**; read-only check found only P06 live; P16/P17/P18 IDs are test-mode prices |
| Security | Authorization and entitlement results | **Staging approved**; production test window still pending |
| Release | Explicit authorization to deploy production | Blocked |

## Current blockers and safety boundary

- No production migration has been performed. An encrypted external production dump is retained at `C:\SafeBackups\pokopia-production-20260922.dump.dpapi` (Windows current-user DPAPI; SHA-256 `3C0928CF24681A499A38293B42C36982EA468988F58120E6CEA32F942197D1E2`).
- No production storage mapping has been activated.
- Storage promotion is complete and hash-verified, but the application mapping changes are not deployed.
- Payments read-only verification found missing live P16/P17/P18 prices; no Stripe configuration was changed.
- No live Stripe credential, price, webhook, or fulfillment configuration has been changed.
- No production smoke test or payment has been run.
- Preview remains the only active stakeholder-review target.
- Production aliases, production Supabase, live Stripe, production storage, and deployment state remain untouched.
