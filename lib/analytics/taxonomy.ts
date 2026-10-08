export const canonicalAnalyticsEventNames = [
  "session_started",
  "free_start_viewed",
  "email_submitted",
  "quick_start_claimed",
  "p06_viewed",
  "p06_buy_clicked",
  "p06_skipped",
  "p16_viewed",
  "p16_buy_clicked",
  "p16_skipped",
  "p18_viewed",
  "p18_buy_clicked",
  "p18_skipped",
  "p18_not_qualified",
  "p17_viewed",
  "p17_buy_clicked",
  "p17_skipped",
  "checkout_started",
  "checkout_completed",
  "purchase_completed",
  "funnel_completed",
] as const;

export type CanonicalAnalyticsEventName = (typeof canonicalAnalyticsEventNames)[number];

export const browserPersistedAnalyticsEventNames = canonicalAnalyticsEventNames.filter((name) => name !== "purchase_completed");

export function isCanonicalAnalyticsEventName(value: unknown): value is CanonicalAnalyticsEventName {
  return typeof value === "string" && (canonicalAnalyticsEventNames as readonly string[]).includes(value);
}

export function isBrowserPersistedAnalyticsEventName(value: unknown): value is Exclude<CanonicalAnalyticsEventName, "purchase_completed"> {
  return isCanonicalAnalyticsEventName(value) && value !== "purchase_completed";
}

const legacyCompatibilityMap: Partial<Record<string, CanonicalAnalyticsEventName>> = {
  pokopia_funnel_started: "session_started",
  pokopia_quick_start_viewed: "free_start_viewed",
  pokopia_quick_start_signup_completed: "email_submitted",
  pokopia_free_claimed: "quick_start_claimed",
  pokopia_daily_reset_viewed: "p06_viewed",
  pokopia_daily_reset_checkout_started: "checkout_started",
  pokopia_daily_reset_skipped: "p06_skipped",
  pokopia_companion_viewed: "p16_viewed",
  pokopia_companion_checkout_started: "checkout_started",
  pokopia_p18_viewed: "p18_viewed",
  pokopia_p18_checkout_started: "checkout_started",
  pokopia_p18_skipped: "p18_skipped",
  pokopia_p17_downsell_viewed: "p17_viewed",
  pokopia_completionist_checkout_started: "checkout_started",
  pokopia_p17_skipped: "p17_skipped",
  pokopia_funnel_checkout_started: "checkout_started",
  pokopia_funnel_checkout_completed: "checkout_completed",
  pokopia_funnel_completed: "funnel_completed",
};

/** Compatibility documentation/helper only. It does not persist a second event. */
export function canonicalEventForLegacyEvent(value: string): CanonicalAnalyticsEventName | undefined {
  return legacyCompatibilityMap[value];
}
