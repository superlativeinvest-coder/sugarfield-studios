export type CheckoutRequest = {
  productId: string;
  funnelId?: string;
  funnelStep?: string;
  funnelSession?: string;
  attribution?: { firstTouch?: Record<string, string>; currentTouch?: Record<string, string> };
  offerId?: string;
  sku?: string;
  upgrade?: boolean;
  sourceOrderId?: string;
};

export type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
};
