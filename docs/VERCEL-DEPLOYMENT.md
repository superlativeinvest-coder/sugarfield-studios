# Vercel deployment

This repository is explicitly configured for the Next.js framework through `vercel.json`. Vercel will run the standard `npm install` and `npm run build` commands; do not add secrets to `vercel.json` or commit `.env.local`.

## First deployment

1. Create a Git repository for this workspace and push the current project to it.
2. In Vercel, create a new project by importing that repository. Keep the root directory set to the repository root and the framework preset set to Next.js.
3. Add the following values in **Settings → Environment Variables** for both Preview and Production. They are server-only and must not use the `NEXT_PUBLIC_` prefix:

   - `MAILERLITE_API_KEY`
   - `MAILERLITE_GROUP_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET` (`digital-products`)
   - Stripe server variables needed by the checkout and webhook routes (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and active price IDs)

4. Set `NEXT_PUBLIC_SITE_URL` to the HTTPS URL for each environment: the Preview deployment URL for Preview and the final custom domain for Production.
5. Deploy the preview, repeat the Quick Start signup/download smoke test through the Vercel URL, then promote to Production.

Vercel environment values are available only to deployments created after they are added or changed, so redeploy after editing them.
