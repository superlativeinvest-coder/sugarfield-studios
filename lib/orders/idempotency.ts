import type { Order, OrderRepository, PaidOrderInput } from "./types";

export async function createOrderIdempotently(repository: OrderRepository, input: PaidOrderInput): Promise<{ order: Order; created: boolean }> {
  const existing = await repository.findByProviderSessionId(input.providerSessionId);
  if (existing) return { order: existing, created: false };
  return { order: await repository.createPaidOrder(input), created: true };
}
