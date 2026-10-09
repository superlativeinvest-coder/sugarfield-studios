# Staging Environment Preflight

Status: PASS for configuration-only preflight; no external provider was contacted.

## Scope and method

This report covers local, non-mutating inspection on 2026-10-09. Before execution, `scripts/staging-readiness.ts` and `scripts/supabase-staging-check.ts` were read with their direct imports: `lib/supabase/environment.ts` and `lib/delivery/p18-staged.ts`. They read local files and classify values; they do not import a provider client, call `fetch`, create Stripe objects, generate signed URLs, or perform database/storage writes.

The following read-only commands then passed:

- `npm run staging:check`
- `npm run supabase:staging:check`

## Verified configuration

- Branch: `codex/pokopia-full-funnel-release`; HEAD: `7ddbb0544e66d4aa3f383d51c8e6bae430bca4b6`.
- Phase 2B `55e7e4a` and Phase 2C `7ddbb05` are ancestors of HEAD.
- `.env.staging.local` selects matching server and browser Supabase targets classified as **STAGING**, approved project ref `faxsnbdjzniwyhtnsvfz`.
- The staging Stripe secret is classified **TEST**. The staging public site is HTTPS and not the public production domain.
- Required cumulative Price ID variables are present and have `price_` format; cumulative checkout, P18 activation, and the P18 staged-storage marker are enabled/present.
- Migration `supabase/migrations/202609190001_add_pokopia_accumulated_order.sql` is present and local Supabase linkage resolves to the approved staging ref.

## Environment classification

| Process/configuration | Classification | Evidence |
| --- | --- | --- |
| `.env.local` | PROHIBITED for provider integration | Contains provider credentials and was not independently approved as staging. |
| `.env.staging.local` | STAGING READ-ONLY | Approved target and TEST mode were proven by local configuration checks only. |
| `.env.test`, `.env.staging`, `.env.production`, `.env` | Missing | No configuration available. |
| Playwright `webServer` | LOCAL MOCKED | `playwright.config.ts` overrides provider values with unreachable local Supabase, test-only Stripe, and blank MailerLite values. |
| Future checkout/email/download test | STAGING MUTATING — REQUIRES APPROVAL | Creates provider or database state. |

## Missing information and blockers

Read-only checks do not prove deployed staging schema, private bucket policy, remote webhook endpoint registration, or Price object contents. Those require either separately approved provider read access or later authorized synthetic integration evidence.

## Proposed mutations and authorization

None occurred. Stage B needs explicit approval before any synthetic checkout, account/session, webhook, order, entitlement, analytics, signed-download, or email action.
