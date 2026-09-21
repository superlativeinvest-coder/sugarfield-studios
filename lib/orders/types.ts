export type OrderStatus = "paid";
export type FulfillmentStatus = "pending" | "fulfilled" | "failed";
export type OrderEntitlement = { productId: string; grantedAt: string; fulfillmentVersion?: string; stripePriceId?: string };
export type OrderLineItem = { productId: string; sku: string; stripePriceId?: string; unitAmount: number; quantity: number; currency: string };

export type Order = {
  id: string;
  provider: "stripe";
  providerSessionId: string;
  providerEventId?: string;
  paymentIntentId?: string;
  productId: string;
  offerId?: string;
  sourceOrderId?: string;
  sku?: string;
  status: OrderStatus;
  amountTotal?: number;
  currency?: string;
  customerEmail?: string;
  customerId?: string;
  funnelId?: string;
  funnelStep?: string;
  funnelSession?: string;
  firstTouchAttribution?: Record<string, string>;
  currentTouchAttribution?: Record<string, string>;
  fulfillmentStatus: FulfillmentStatus;
  lineItems?: OrderLineItem[];
  entitlements: OrderEntitlement[];
  createdAt: string;
};

export type PaidOrderInput = Omit<Order, "id" | "status" | "fulfillmentStatus" | "entitlements"> & { fulfillmentStatus?: FulfillmentStatus; entitlements?: OrderEntitlement[] };

export interface OrderRepository {
  findById(orderId: string): Promise<Order | null>;
  listPaidByCustomer(customerId: string): Promise<Order[]>;
  findByProviderSessionId(providerSessionId: string): Promise<Order | null>;
  findByFunnelSession(funnelSession: string): Promise<Order | null>;
  findLatestPaidByCustomerAndProduct(customerId: string, productId: string): Promise<Order | null>;
  createPaidOrder(input: PaidOrderInput): Promise<Order>;
  updateFulfillmentStatus(orderId: string, status: FulfillmentStatus): Promise<Order | null>;
}
