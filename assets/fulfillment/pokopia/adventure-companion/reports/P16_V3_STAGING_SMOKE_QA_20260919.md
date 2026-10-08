# P16 V3 Staging Smoke QA — 2026-09-19

- Preview deployment: Ready isolated Vercel Preview (staging configuration only)
- Preview URL: `https://sugarfield-studios-24w5o2yit-superlativeinvest-2944s-projects.vercel.app`
- Deployment ID: `dpl_4ZFkPGoGCRrTQTCpQYCfTQeZXtim`
- Stripe mode: test/sandbox
- Checkout creation: PASS; cumulative P16 selected the configured $19.99 test price
- `checkout.session.completed` webhook: PASS; test event delivered with P16 metadata
- Staging order/entitlement: PASS; entitlement resolved to `P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED`
- Authorized signed download: PASS; P16 V3 delivery endpoint returned a temporary signed download
- Unauthorized download: PASS; request without an authenticated customer session returned HTTP 401
- P16 V3 storage verification: PASS (12/12 objects; 6 reused, 6 uploaded)

No signed URL was persisted. No live Stripe, production deployment, production storage, or P16 V2 state was changed.
