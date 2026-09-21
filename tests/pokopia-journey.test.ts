import test from "node:test";
import assert from "node:assert/strict";
import { canActOnP17Downsell, canViewP17Downsell, emptyPokopiaJourney, isDoubleSkip } from "@/lib/pokopia-funnel/journey";
import { hasCurrentJourneyP18Eligibility } from "@/lib/pokopia-funnel/eligibility";

test("current selected P06 or P16 creates server-trusted P18 eligibility", () => {
  assert.equal(hasCurrentJourneyP18Eligibility({ ...emptyPokopiaJourney("journey"), selectedProducts: ["P06"], dailyResetAccepted: true }), true);
  assert.equal(hasCurrentJourneyP18Eligibility({ ...emptyPokopiaJourney("journey"), selectedProducts: ["P16"], companionAccepted: true }), true);
});
test("double skip has precedence over any other qualification", () => {
  const journey = { ...emptyPokopiaJourney("journey"), dailyResetSkipped: true, companionSkipped: true };
  assert.equal(isDoubleSkip(journey), true);
  assert.equal(hasCurrentJourneyP18Eligibility(journey), false);
});
test("P17 remains unavailable without both qualified P18 view and P18 skip", () => {
  const base = emptyPokopiaJourney("journey");
  assert.equal(canViewP17Downsell(base), false);
  const allowed = { ...base, p18QualifiedView: true, p18Skipped: true, p17Eligible: true, currentStep: "completionist-kit" };
  assert.equal(canViewP17Downsell(allowed), true);
  assert.equal(canActOnP17Downsell(allowed), true);
});
