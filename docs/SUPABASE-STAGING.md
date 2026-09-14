# Supabase environments

Production is `lbbxdvszykxdaytqmqnl.supabase.co`. It must never be used by staging migration or bootstrap tooling.

Approved hosted staging is `faxsnbdjzniwyhtnsvfz.supabase.co`. Staging is for migration validation, passwordless Auth, funnel journeys, Stripe test-mode fixtures, and download-authorization tests only.

Create an ignored `.env.staging.local` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, all from the approved staging project. Run `npm run supabase:staging:check` before any future staging operation. The checker fails closed for production, unknown, missing, or mismatched project refs.

Staging Auth callbacks may allow `http://localhost:3000/auth/callback`, `http://localhost:3001/auth/callback`, and a future explicit staging-deployment callback. Do not use wildcard redirects. Keep Email magic links enabled and anonymous sign-in disabled.

Never use live Stripe credentials, prices, or webhooks for staging. P18 checkout and customer access remain inactive until separately approved.
