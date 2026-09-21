import { products } from "@/lib/catalog/data";
import type { CheckoutRequest } from "./types";

export function validateCheckoutRequest(request: unknown): CheckoutRequest | null {
  if (!request || typeof request !== "object" || !("productId" in request)) return null;
  const productId = request.productId;
  if (typeof productId !== "string" || productId.length === 0) return null;
  const requestObject = request as Record<string, unknown>;
  return {
    productId,
    ...(typeof requestObject.funnelId === "string" ? { funnelId: requestObject.funnelId } : {}),
    ...(typeof requestObject.funnelStep === "string" ? { funnelStep: requestObject.funnelStep } : {}),
    ...(typeof requestObject.funnelSession === "string" ? { funnelSession: requestObject.funnelSession } : {}),
    ...(requestObject.attribution && typeof requestObject.attribution === "object" ? { attribution: requestObject.attribution as CheckoutRequest["attribution"] } : {}),
    ...(typeof requestObject.offerId === "string" ? { offerId: requestObject.offerId } : {}),
    ...(typeof requestObject.sku === "string" ? { sku: requestObject.sku } : {}),
    ...(typeof requestObject.upgrade === "boolean" ? { upgrade: requestObject.upgrade } : {}),
    ...(typeof requestObject.sourceOrderId === "string" ? { sourceOrderId: requestObject.sourceOrderId } : {}),
  };
}

export function getCheckoutProduct(productId: string) {
  // P17 is intentionally unpublished because it is a gated downsell; its
  // journey gate is enforced by the checkout endpoint before this lookup.
  return products.find((product) => product.id === productId && product.commerce?.active === true && Boolean(product.commerce.stripePriceId));
}

export function isCompanionUpgradeRequest(request: CheckoutRequest): boolean {
  return request.productId === "P16" && request.offerId === "pokopia_companion" && (request.sku === "P16" || request.sku === "pokopia_adventure_companion") && request.upgrade === false && request.funnelStep === "companion";
}

export function isCompletionistUpgradeRequest(request: CheckoutRequest): boolean {
  return request.productId === "P17" && request.offerId === "pokopia_completionist_kit" && request.sku === "P17" && request.upgrade === false && request.funnelStep === "completionist-kit";
}

export function isCompletePlayerSystemRequest(request: CheckoutRequest): boolean {
  return request.productId === "P18" && request.offerId === "pokopia_complete_player_system" && request.sku === "pokopia_complete_player_system" && request.upgrade === true && request.funnelStep === "complete-player-system" && Boolean(request.sourceOrderId);
}
