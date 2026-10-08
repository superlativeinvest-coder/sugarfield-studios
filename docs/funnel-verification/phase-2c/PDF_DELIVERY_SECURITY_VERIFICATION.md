# PDF Delivery and Security Verification

Status: PARTIAL — code and manifests are verified locally; live staging authorization/download proof remains blocked.

## Verified locally

- `npm test`: **140 passed, 0 failed, 0 skipped**.
- Tests verify P16 V3’s six Letter/A4 pairs, P18’s 22 staged PDFs, approved hash-locked manifest sources when the external artifact root exists, P17’s four-file package, and Quick Start’s two-file map.
- Test names include `P17 remains the approved four-file package with the final-v2 P04 object`, `Quick Start file allowlist rejects arbitrary and paid file identifiers`, and `Quick Start access token is opaque, hashed, and one-hour signed URLs are expected`.
- Customer order downloads require an authenticated owner and matching entitlement (`app/api/orders/[order-id]/downloads/[product-id]/route.ts:15-21`).
- The webhook grants immutable active P16/P18 fulfillment versions only after environment approval (`app/api/stripe/webhook/route.ts:55-59, 78-83`).

## Evidence and limits

The earlier staging report `docs/funnel-verification/phase-2a-1/STAGING_DELIVERY_AUTHORIZATION_REPORT.md` records historical evidence but is not treated as a new Phase 2C end-to-end result. No storage listing, signed URL, customer authentication, wrong-customer request, or byte retrieval was sent to staging in this phase.

Therefore private object availability, signed-URL expiry behavior, authenticated owner download, non-owner denial, and end-to-end entitlement-to-file access are **NOT VERIFIED in Phase 2C**.

## Required next action

After an authorized staging order exists, test anonymous, wrong-owner, and non-entitled denial; then confirm entitled signed downloads, expiration, private storage rejection, expected P17 files, and P16/P18 file counts. Do not expose object URLs or customer information in evidence.

Rollback: no storage object or entitlement was changed in this phase.
