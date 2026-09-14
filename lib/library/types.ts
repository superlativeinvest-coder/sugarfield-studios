export type LibraryItem = {
  productId: string;
  orderId: string;
  grantedAt: string;
  downloadUrl?: string;
};

export interface LibraryRepository {
  listForCustomer(customerId: string): Promise<LibraryItem[]>;
}
