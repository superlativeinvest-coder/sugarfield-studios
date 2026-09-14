export const sugarfieldEvents = ["funnel_landing_view", "collection_view", "product_view", "product_gallery_view", "related_product_click", "bundle_view", "checkout_start", "purchase", "download", "upsell_view", "upsell_accept", "upsell_decline", "email_signup", "pokopia_funnel_view", "pokopia_goal_selected", "pokopia_assessment_started", "pokopia_assessment_completed", "pokopia_lead_submitted", "pokopia_product_viewed", "pokopia_bundle_viewed", "pokopia_add_to_cart", "pokopia_checkout_started", "pokopia_funnel_started", "pokopia_lead_captured", "pokopia_daily_reset_viewed", "pokopia_daily_reset_checkout_started", "pokopia_daily_reset_purchased", "pokopia_daily_reset_checkout_cancelled", "pokopia_daily_reset_skipped", "pokopia_mini_tool_viewed", "pokopia_mini_tool_checkout_started", "pokopia_mini_tool_unavailable", "pokopia_companion_viewed", "pokopia_companion_checkout_started", "pokopia_companion_unavailable", "pokopia_completionist_offer_view", "pokopia_completionist_checkout_started", "pokopia_completionist_unavailable", "pokopia_quick_start_viewed", "pokopia_quick_start_signup_started", "pokopia_quick_start_signup_completed", "pokopia_quick_start_download_letter", "pokopia_quick_start_download_a4", "pokopia_quick_start_daily_reset_clicked", "pokopia_funnel_offer_viewed", "pokopia_funnel_offer_accepted", "pokopia_funnel_offer_skipped", "pokopia_funnel_tier_changed", "pokopia_funnel_cart_updated", "pokopia_funnel_checkout_review_view", "pokopia_funnel_checkout_started", "pokopia_funnel_checkout_completed", "pokopia_funnel_offer_purchased", "pokopia_funnel_completed", "pokopia_p18_viewed", "pokopia_p18_checkout_started", "pokopia_p18_skipped", "pokopia_p17_downsell_viewed", "pokopia_p17_skipped"] as const;
export type SugarfieldEventName = (typeof sugarfieldEvents)[number];

export type SugarfieldEvent = {
  event: SugarfieldEventName;
  funnel_id?: string;
  funnel_version?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  page_path?: string;
  product_id?: string;
  sku?: string;
  funnel_session?: string;
  value?: number;
  currency?: string;
  goal?: string;
  offer_id?: string;
  prior_step?: string;
  branch?: string;
  branch_reason?: string;
  journey_id?: string;
  funnel_session_id?: string;
  first_touch_attribution?: Record<string, string>;
  current_attribution?: Record<string, string>;
};

export function trackSugarfieldEvent(event: SugarfieldEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sugarfield:event", { detail: event }));
}
