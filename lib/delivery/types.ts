export type Entitlement = {
  id: string;
  orderId: string;
  productId: string;
  customerId: string;
  grantedAt: string;
  fulfillmentVersion?: string;
};

export type SecureDownload = {
  url: string;
  expiresAt: string;
  downloads?: { name: string; url: string; expiresAt: string }[];
};

export interface DeliveryProvider {
  createSecureDownload(entitlement: Entitlement): Promise<SecureDownload>;
}
