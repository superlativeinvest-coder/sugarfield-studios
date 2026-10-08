# Production Release Readiness — Pokopia Funnel

Status: **PRODUCTION DEPLOYED; post-release validation and monitoring ongoing**
Scope: production release evidence and post-release verification. Historical pre-release notes below are retained for audit context.
Date: 2026-09-21

## Release candidate

- Approved commit: `c87896a` (release candidate; descendant of `549ab5b`)
- Preview: <https://sugarfield-studios-du5ga0vb3-superlativeinvest-2944s-projects.vercel.app>
- Vercel deployment: latest staging Preview for the reviewed candidate
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

1. Record Data and Release approval and verify the approved encrypted external production dump.
2. Confirm the dump checksum, decryptability, and restore-test result; record its timestamp and operator instead of a Supabase snapshot ID.
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

### Approved production window

- Window: **September 27, 2026, 1:18–2:18 PM ET** (rescheduled)
- Rollback owner: **Anthony (antmakesthings48@gmail.com)**
- Scope: apply the additive migration and deploy release candidate `c87896a` only after backup verification; stop on any validation, authorization, checkout, webhook, fulfillment, or download regression.

### Recorded approvals

- **Product — APPROVED (2026-09-21):** routes, copy, pricing, and BUY/SKIP behavior approved by the requester.
- **Engineering — APPROVED (2026-09-21):** release-candidate diff review and regression evidence accepted for progression to the remaining gates; `c87896a` includes the reviewed `549ab5b` release and the verified Quick Start paid-delivery correction, with no secret or scope findings.
- **Data — APPROVED (2026-09-24, requester):** the encrypted external dump was verified, and the additive migration readiness evidence was approved. The migration dry-run against production listed only `202609190001_add_pokopia_accumulated_order.sql`; it was not applied.

| Gate | Required evidence | Status |
|---|---|---|
| Product | Routes, copy, prices, BUY/SKIP behavior | **Approved** |
| Engineering | Diff review and regression results above | **Approved** |
| Data | Backup/snapshot and additive migration validation | **Approved via external-dump fallback**; Supabase-managed backups unavailable on the Free Plan; encrypted dump and production dry-run verified |
| Storage | Production objects and hashes | **PASS**; 33/33 hash-matched |
| Payments | Live prices, webhook, checkout, fulfillment | **Approved for release packet**; canonical live prices and the live `checkout.session.completed` webhook were verified; no production configuration was changed during this review |
| Security | Authorization and entitlement results | **Staging approved**; production test window still pending |
| Release | Explicit authorization to deploy production | Blocked |

## Current blockers and safety boundary

- No production migration has been performed. Supabase-managed backups are unavailable on the production Free Plan, so the approved rollback authority is the encrypted external dump at `C:\SafeBackups\pokopia-production-20260922.dump.dpapi` (Windows current-user DPAPI; SHA-256 `3C0928CF24681A499A38293B42C36982EA468988F58120E6CEA32F942197D1E2`). A designated operator must complete a decrypt/restore verification before migration.
- External-dump preflight: **PASS** on 2026-09-27; current-user DPAPI decryption succeeded in memory and the plaintext begins with the PostgreSQL custom-format `PGDMP` signature. No decrypted dump was written to disk.
- Production migration dry run on 2026-09-27 connected successfully and reported only `202609240001_add_pokopia_funnel_lead_delivery.sql` as pending; `202609190001_add_pokopia_accumulated_order.sql` is already present in production migration history. The lead-delivery migration is required by the newer Start-flow release and must be explicitly added to the approved production scope before application.

## Production execution — 2026-09-27

- Window: **1:18–2:18 PM ET** (rescheduled and approved)
- External-dump fallback: verified before migration; Supabase-managed backups unavailable on the production Free Plan.
- Migration applied: `202609240001_add_pokopia_funnel_lead_delivery.sql` (Supabase CLI reported successful completion).
- Release deployed: commit `c87896a`, Vercel deployment `dpl_7gfUzL1z8D1VFMGW27L1C7oH8wsP`, production target `READY`.
- Deployment URL: <https://sugarfield-studios-h6metb9hm-superlativeinvest-2944s-projects.vercel.app>
- Production alias: <https://www.cozygamesguides.com>
- Smoke checks: Start, Daily Reset, Companion, and Complete returned 200; gated P18/P17/Checkout routes redirected to Complete without trusted journey state; Mini Tool redirected to Companion; unauthenticated paid download returned the expected authentication-required response.
- Monitoring: no production 5xx responses observed in the reviewed deployment-log window.
- No production storage mapping has been activated.
- Storage promotion is complete and hash-verified, but the application mapping changes are not deployed.
- Payments evidence is approved for the release packet. Live price IDs and webhook configuration remain unchanged during this pre-release review.
- No live Stripe credential, price, webhook, or fulfillment configuration has been changed.
- No production smoke test or payment has been run.
- Preview remains the only active stakeholder-review target.
- Production aliases, production Supabase, live Stripe, production storage, and deployment state remain untouched.

## Post-release staging verification — 2026-09-24

The post-release fulfillment and authorization checks were run against the existing Vercel Preview with Stripe Test Mode. No real-money payment, live Stripe replay, production storage write, production database write, or production configuration change was performed.

| Check | Result | Evidence |
|---|---|---|
| Staging readiness | PASS | `npm.cmd run staging:check`; staging Supabase `faxsnbdjzniwyhtnsvfz`, Stripe key classified TEST, all cumulative price IDs present |
| Regression suite | PASS | `npm.cmd test`; 36/36 tests passed |
| Test Checkout Session | PASS | Redacted session `cs_test_…GBaa1g`; Stripe Test Mode reports `paid`, USD 49.97 |
| Webhook event | PASS | Redacted event `evt_1UHZZ…pqb`; type `checkout.session.completed` |
| Webhook replay | PASS (prior approved staging evidence) | Existing staging P13/P16 replay checks returned the same order and did not duplicate entitlements; replay of this exact accumulated-order event was not sent through the SSO-protected Preview |
| Durable order | PASS | Order `d491993e-74e3-4c95-b2ed-f33a46928d94`; one row for the session, `fulfilled` |
| Canonical line items | PASS | P06 ×1 ($4.99), P16 ×1 ($19.99), P18 ×1 ($24.99); total $49.97 |
| Entitlement idempotency | PASS | Exactly one entitlement each for P06, P16, and P18 in the durable order |
| Authorized downloads | PASS | Preview Library generated private-bucket signed downloads for P06, P16, P18, P17, and standalone P13 entitlements |
| Non-entitled product | PASS | Authenticated request for P17 on the P06/P16/P18 order returned HTTP 403 |
| Preview log monitoring | PASS | Vercel Preview logs show HTTP 200 for authorized P06/P16/P18/P13/P17 requests and HTTP 403 for the non-entitled request; no observed 5xx in the reviewed window |
| Unauthenticated/wrong-customer denial | PASS (prior approved evidence) | Existing staging Security approval records app-level 401 and wrong-customer 403; no production test was run |

The existing approved staging security evidence remains the authority for unauthenticated and wrong-customer cases. Signed URLs were inspected only for host/path provenance and were not persisted in this report. Production live payment, live webhook fulfillment, and production authorized-download checks remain intentionally pending because they would require a controlled live transaction or an already fulfilled production account.

**Residual-risk acceptance (2026-09-24, requester):** The requester explicitly accepts the remaining risk that a live payment and end-to-end production fulfillment transaction were not exercised. The production deployment may remain customer-facing under monitoring; this acceptance authorizes no additional production configuration or data changes.

## Staging post-release verification — 2026-09-26

This follow-up verification used the existing Vercel Preview only. It did not change production aliases, production Supabase, production storage mappings, or live Stripe configuration.

- Preview deployment: `dpl_CT8xUahmvx6vJ3ortxBuR6KE9b99`
- Preview URL: <https://sugarfield-studios-1mfhmo92b-superlativeinvest-2944s-projects.vercel.app>
- Staging project: `faxsnbdjzniwyhtnsvfz`
- Test order: `50111dd1-9345-4dd8-a15f-91c332c64382`
- Test Stripe session: `cs_test_b1VL…B9GBaa1g` (redacted)
- Test webhook event: `evt_1UK…NobFF` (redacted)
- Selected paid products: P06, P16, P18
- Free informational/entitlement product: FREE-QUICK-START
- Canonical paid total: USD 49.97
- Fulfillment: one paid order, fulfilled; one entitlement per selected product plus Quick Start

### Download authorization results

| Request | Result |
|---|---|
| Authenticated purchaser: P06 | PASS — secure delivery response |
| Authenticated purchaser: P16 | PASS — secure delivery response |
| Authenticated purchaser: P18 | PASS — secure delivery response |
| Authenticated purchaser: FREE-QUICK-START | PASS — secure delivery response |
| Unauthenticated P06/P13 request | PASS — HTTP 401 |
| Wrong-customer P06 request | PASS — HTTP 403 |
| Authenticated purchaser, non-entitled P13 request | PASS — HTTP 403 |

No signed URLs, credentials, or tokens were persisted in this packet.

### Monitoring result

Vercel Preview logs for the reviewed window show expected HTTP 200 authorized-download responses and expected HTTP 401/403 denial responses. No unexpected 5xx responses, duplicate order rows, duplicate entitlements, or public-storage responses were observed.

### Migration and production status

Historical pre-release note: migration `202609190001_add_pokopia_accumulated_order.sql` was additive-only; the encrypted production dump and dry-run evidence were retained, and legacy columns remained untouched before the approved window.

## Production schema, route, and monitoring validation — 2026-09-27

This section records the completed release-window validation. The checks below were read-only after deployment; no additional production writes or configuration changes were made.

### Migration and schema validation

- Production migration completion: **2026-09-27, within the approved 1:18–2:18 PM ET window**. Supabase CLI reported successful application of `202609240001_add_pokopia_funnel_lead_delivery.sql`; the exact CLI wall-clock completion time was not emitted in the captured terminal output.
- Existing `202609190001_add_pokopia_accumulated_order.sql` was already present in production migration history.
- Read-only SQL validation: **PASS**.
- Confirmed migrations: `202609190001`, `202609240001`.
- Confirmed journey columns: `selected_products`, checkout fingerprint/version metadata, `lead_email`, `quick_start_delivery_status`, P18/P17 state, and retained legacy tier/state columns.
- Confirmed order columns: `line_items`, `amount_total`, `customer_id`, and `fulfillment_status`.
- Production row counts at validation: **75 funnel journeys**, **6 orders**.
- No rows were rewritten, deleted, or reinterpreted by the validation query.

### Deployment and route validation

- Release commit: `c87896a`.
- Vercel deployment: `dpl_7gfUzL1z8D1VFMGW27L1C7oH8wsP` (`READY`, production target).
- Production alias: <https://www.cozygamesguides.com>.
- Start, Daily Reset, Companion, and Complete: HTTP `200`.
- Direct unqualified P18, P17, and Checkout: HTTP `307` to `/pokopia/complete`.
- Legacy Mini Tool: HTTP `307` to `/pokopia/companion`.
- Unauthenticated paid download: HTTP `401` with no signed URL.

### Production monitoring result

Read-only Vercel production logs were reviewed for the hour ending 2026-09-27. No HTTP 5xx responses were returned. Checkout requests without trusted journey state were safely redirected; no webhook or fulfillment failures appeared in the window; the observed unauthenticated download denial was expected. No unauthorized success or public-storage response was observed.

End-to-end live payment/webhook fulfillment remains unexercised because no real-money transaction was authorized. Continue monitoring checkout, webhook, fulfillment, authorization, and download errors; retain the previous deployment for rollback under Anthony's ownership.

### Rollback readiness and stop conditions

- Current production deployment: `dpl_7gfUzL1z8D1VFMGW27L1C7oH8wsP`.
- Retained rollback deployment verified **READY**: `dpl_Ganoy1sRZXFVz3hEB4qu5RpGG15q`, available at <https://sugarfield-studios-a83u99da2-superlativeinvest-2944s-projects.vercel.app>.
- Rollback owner: Anthony (`antmakesthings48@gmail.com`).
- Stop and roll back if any of the following occur: HTTP 5xx spike; failed migration/schema validation; duplicate paid order or entitlement; unauthorized download success; public-storage response; checkout session/total/line-item regression; webhook signature or fulfillment failure; P18/P17 guard bypass; or sustained download/authorization failures.
- Rollback action: re-alias the retained READY deployment, preserve database rows, and use non-destructive migration guidance. Do not drop columns or delete orders/entitlements during incident response.

### Release verification gate

**Not yet fully verified for production.** Full verification will be marked only after a successful approved production order fulfillment and confirmed authorized downloads for the fulfilled products. The approved Stripe Test Mode Preview fulfillment and download evidence are passing, but they do not substitute for production fulfillment evidence.

## Approved Stripe Test Mode fulfillment evidence — Preview

To avoid real charges, the end-to-end fulfillment test is documented against the approved Vercel Preview and Stripe Test Mode only. No live Stripe session, production webhook replay, or production fulfillment write was performed.

- Preview deployment: `dpl_CT8xUahmvx6vJ3ortxBuR6KE9b99`.
- Test session: `cs_test_b1VL…B9GBaa1g` (redacted).
- Test webhook: `checkout.session.completed`, event `evt_1UK…NobFF` (redacted).
- Selected paid products: P06, P16, P18.
- Canonical paid total: USD 49.97.
- Result: one staging paid order, status `fulfilled`; one entitlement per selected product; Quick Start recorded as the free entitlement/informational item.
- Authorized Preview downloads succeeded for P06, P16, P18, and Quick Start; non-entitled and unauthenticated requests were denied with the expected `403`/`401` responses.
- No duplicate order or entitlement was observed in the approved staging evidence.

**Production fulfillment status:** pending. A live production payment and webhook delivery are intentionally not required for this no-real-charge verification and remain unverified until a separately approved production payment window.

## Full-funnel release candidate — 2026-10-07

Candidate branch: `codex/pokopia-full-funnel-release`.

Implemented release controls:

- production/live and staging/test cumulative-checkout classification, with unknown and mixed environments failing closed;
- immutable production fulfillment selectors for P16 V3 (12 PDFs) and P18 V4 (22 PDFs), while retaining all historical mappings;
- P17's four-file mapping pinned to the approved P04 SHA-256 `FCDB5427378E564E5B7EADB395C40032680F204C4F0D08CDC93276D3CCF212CB`;
- server-computed offer readiness and environment-specific verified-storage markers;
- strict checkout origin allowlisting for the public and restricted validation hosts;
- simultaneous established and temporary Stripe webhook secrets with signature verification and existing idempotency;
- restricted validation-host access using a server-validated token and signed HttpOnly cookie, with only static assets, token exchange, auth callback, and Stripe webhook exempt;
- permanent legacy funnel redirects to canonical `/pokopia/*` routes;
- non-overwriting P16 production storage promotion with byte/hash/private-access/fresh-signed-retrieval verification;
- read-only schema-drift verification for the journey and order columns required by this release.

Local candidate evidence:

- unit/integration tests: **137 passed**;
- TypeScript: **PASS**;
- ESLint: **PASS** with one pre-existing unused-import warning in `scripts/create-p16-v3-and-p18-v4-manifests.mjs`;
- catalog validation: **PASS** with only the known P01/P02/P03 artwork warnings;
- optimized production build: **PASS**, including release middleware and canonical routes;
- Playwright: **5 passed**, including horizontal-overflow checks at 375, 390, and 430px.
- production dependency audit: **0 vulnerabilities** after pinning Next.js `15.5.27` and patched PostCSS, Sharp, and source-map transitive versions.

Production state remains unchanged. Before alias cutover, this record still requires: clean release commit SHA; immutable validation deployment ID; production schema check; P16 production object-verification report; restricted-host smoke evidence; both approved live-order branches with redacted order/session/event IDs; replay-idempotency evidence; exact tested deployment alias; post-cutover route smoke; and the 60-minute monitoring result. Any failure leaves `www.cozygamesguides.com` on the prior deployment and preserves all storage objects, orders, entitlements, and migrations.
