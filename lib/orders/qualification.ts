import type { Order, OrderRepository } from "./types";

export function isVerifiedDailyResetBuyer(order: Order | null): boolean {
  return Boolean(order?.status === "paid" && order.productId === "P06" && order.entitlements.some((entitlement) => entitlement.productId === "P06"));
}

export function isVerifiedCompanionBuyer(order: Order | null): boolean {
  return Boolean(order?.status === "paid" && order.productId === "P16" && order.entitlements.some((entitlement) => entitlement.productId === "P16"));
}

export async function qualifiesForDailyResetUpgrade(repository: OrderRepository, context: { orderId?: string; funnelSession?: string }): Promise<boolean> {
  const order = context.orderId ? await repository.findById(context.orderId) : context.funnelSession ? await repository.findByFunnelSession(context.funnelSession) : null;
  return isVerifiedDailyResetBuyer(order);
}

export async function qualifiesForCompanionUpgrade(repository: OrderRepository, context: { orderId?: string; funnelSession?: string }): Promise<boolean> {
  const order = context.orderId ? await repository.findById(context.orderId) : context.funnelSession ? await repository.findByFunnelSession(context.funnelSession) : null;
  return isVerifiedDailyResetBuyer(order);
}

export async function qualifiesForCompletionistUpgrade(repository: OrderRepository, context: { orderId?: string; funnelSession?: string }): Promise<boolean> {
  const order = context.orderId ? await repository.findById(context.orderId) : context.funnelSession ? await repository.findByFunnelSession(context.funnelSession) : null;
  return isVerifiedCompanionBuyer(order);
}
