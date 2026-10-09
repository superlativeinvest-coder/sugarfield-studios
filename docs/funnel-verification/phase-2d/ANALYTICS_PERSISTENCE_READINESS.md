# Analytics Persistence Readiness

Status: PARTIAL — canonical event design and local protections are verified; staging persistence/isolation is NOT VERIFIED.

## Verified implementation

- Canonical events are declared in `lib/analytics/taxonomy.ts`, including Quick Start, P06/P16/P18/P17 decisions, checkout, and trusted purchase completion.
- `app/api/analytics/events/route.ts` validates browser payloads and derives attribution/device context server-side.
- `lib/analytics/server.ts` inserts through the service-role client and treats duplicate `event_id` conflicts as deduplicated; authoritative checkout/purchase IDs are deterministic from the canonical order ID.
- The analytics migration enforces unique `event_id` and a one-purchase-per-order unique index.
- Advertising consent is explicit and signed server-side; TikTok event dispatch remains gated by affirmative consent (`lib/privacy/advertising-consent-server.ts`, `lib/analytics/tiktok-pixel.ts`).
- Playwright local isolation deliberately makes persistence fail locally rather than send external analytics.

## Future staging verification

Using only authorized synthetic journeys, inspect redacted records for journey linkage, selected products, canonical totals, first/current attribution, and deduplicated `checkout_completed`/`purchase_completed` events. Confirm test identifiers make the records excludable from production reporting.

## Expected writes and blockers

At least two authoritative analytics rows are expected per paid order: `checkout_completed` and `purchase_completed`. Browser/interactions create additional page/decision rows; exact count depends on verified navigation and must be reported from persisted synthetic evidence rather than assumed.

Stage A did not query or write any analytics provider or table. Staging analytics isolation and reporting segregation are pending explicit Stage B authorization.
