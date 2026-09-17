import test from "node:test";
import assert from "node:assert/strict";
import { emptyPokopiaJourney } from "@/lib/pokopia-funnel/journey";
import { hasCurrentJourneyP18Eligibility, hasVerifiedHistoricalP06Ownership, isDoubleSkip, resolveP18Eligibility } from "@/lib/pokopia-funnel/eligibility";
import type { Order } from "@/lib/orders/types";

const customerId = "1eb8e6a1-0c3b-4432-8961-e5a70a329dae";
const paidP06: Order = { id: "p06-order", provider: "stripe", providerSessionId: "cs_test_p06", productId: "P06", status: "paid", customerId, fulfillmentStatus: "fulfilled", entitlements: [{ productId: "P06", grantedAt: "2026-09-16T00:00:00.000Z" }], createdAt: "2026-09-16T00:00:00.000Z" };

test("a server-valid current P06 selection qualifies before any Stripe order exists", () => {
  const journey = { ...emptyPokopiaJourney("journey"), selectedTier: "P06" as const, currentTotalCents: 499, dailyResetAccepted: true, currentStep: "companion" };
  assert.equal(hasCurrentJourneyP18Eligibility(journey), true);
});

test("P06 skip followed by a server-valid P16 selection qualifies for P18", () => {
  const journey = { ...emptyPokopiaJourney("journey"), dailyResetSkipped: true, companionAccepted: true, selectedTier: "P16" as const, currentTotalCents: 1999, currentStep: "complete-player-system" };
  assert.equal(hasCurrentJourneyP18Eligibility(journey), true);
});

test("double skip always bypasses P18 and P17, including for a historical owner", async () => {
  const journey = { ...emptyPokopiaJourney("journey"), dailyResetSkipped: true, companionSkipped: true, selectedTier: "FREE" as const };
  const repository = { findLatestPaidByCustomerAndProduct: async () => paidP06 } as never;
  assert.equal(isDoubleSkip(journey), true);
  assert.equal(await resolveP18Eligibility(journey, repository, customerId), false);
});

test("only a verified historical P06 order for the authenticated customer qualifies", async () => {
  const repository = { findLatestPaidByCustomerAndProduct: async (id: string, product: string) => id === customerId && product === "P06" ? paidP06 : null } as never;
  assert.equal(await hasVerifiedHistoricalP06Ownership(repository, customerId), true);
  assert.equal(await hasVerifiedHistoricalP06Ownership(repository, undefined), false);
  assert.equal(await hasVerifiedHistoricalP06Ownership({ findLatestPaidByCustomerAndProduct: async () => ({ ...paidP06, entitlements: [] }) } as never, customerId), false);
});

test("client-only fields cannot create current-journey eligibility", () => {
  const journey = { ...emptyPokopiaJourney("journey"), selectedTier: "P06" as const, currentTotalCents: 499 };
  const clientSupplied = { sourceOrderId: paidP06.id, eligible: true, selectedTier: "P16" };
  assert.equal(Boolean(clientSupplied.sourceOrderId && clientSupplied.eligible), true);
  assert.equal(hasCurrentJourneyP18Eligibility(journey), false);
});
