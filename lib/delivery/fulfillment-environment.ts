import { P16_PRODUCTION_FULFILLMENT_VERSION } from "./p16-production";
import { P16_V3_FULFILLMENT_VERSION } from "./p16-v3-staged";
import { P18_PRODUCTION_FULFILLMENT_VERSION } from "./p18-production";
import { P18_STAGED_FULFILLMENT_VERSION } from "./p18-staged";
import { classifySupabaseTarget } from "@/lib/supabase/environment";

export type ActiveFulfillmentVersions = {
  environment: "STAGING" | "PRODUCTION";
  p16: string;
  p18: string;
};

export function getActiveFulfillmentVersions(environment: Record<string, string | undefined>): ActiveFulfillmentVersions | null {
  const target = classifySupabaseTarget(environment.SUPABASE_URL);
  if (target === "STAGING" && environment.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    return { environment: target, p16: P16_V3_FULFILLMENT_VERSION, p18: P18_STAGED_FULFILLMENT_VERSION };
  }
  if (target === "PRODUCTION" && environment.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
    return { environment: target, p16: P16_PRODUCTION_FULFILLMENT_VERSION, p18: P18_PRODUCTION_FULFILLMENT_VERSION };
  }
  return null;
}
