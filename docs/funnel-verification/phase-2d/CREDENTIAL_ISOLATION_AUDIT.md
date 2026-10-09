# Credential Isolation Audit

Status: PASS for local browser-test isolation; `.env.local` remains prohibited for integrations.

## Evidence inspected

- Environment filenames and variable names only; no value, token, or connection string was emitted.
- `next.config.ts` selects a local build directory outside Vercel.
- `playwright.config.ts` supplies `SUPABASE_URL` and public Supabase URL at unreachable loopback port 9, synthetic test keys, a test Stripe key, blank MailerLite variables, and disabled cumulative checkout.
- `lib/supabase/server.ts`, `lib/stripe/server.ts`, `lib/email/provider.ts`, `components/analytics/TikTokPixelLoader.tsx`, and `lib/analytics/tiktok-pixel.ts` were inspected for initialization behavior.

## Verified findings

- `.env.local` has Supabase, Stripe, MailerLite, and deployment-related variable names. Its Stripe key classifies as LIVE from prefix inspection; its Supabase target is not an approved staging ref. It must not be used for integration verification.
- `.env.staging.local` includes only the required staging-provider variable classes. It contains no MailerLite API key or group ID.
- Playwright’s explicit environment overrides prevent an accidental browser regression run from using `.env.local` provider values. The Phase 2C isolated suite proved local failed-safe analytics persistence with no external provider target.
- The existing configuration uses `reuseExistingServer: !process.env.CI`; future QA must not reuse an already-running server unless its process environment is independently proven isolated.

## Contamination controls for Stage B

1. Launch the staging app only from `.env.staging.local` through a documented staging deployment/runtime, never `.env.local`.
2. Re-run both read-only staging scripts immediately before each mutation.
3. Record only mode, project ref, configuration presence, and redacted identifiers in evidence.
4. Stop if a target is UNKNOWN, PRODUCTION, mismatched, or live Stripe.

## Missing information and authorization

The staging deployment’s actual environment injection and CI secret source are NOT VERIFIED by local file inspection. No provider access was attempted. Verifying a deployed integration requires explicit Stage B authorization after deployment/environment ownership is confirmed.
