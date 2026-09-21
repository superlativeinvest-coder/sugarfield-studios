export const PRODUCT_NAMES: Record<string, string> = {
  "FREE-QUICK-START": "Pokopia Quick Start Pack",
  P06: "Pokopia Daily Reset",
  P13: "Pokopia Event Tracker",
  P16: "Pokopia Adventure Companion",
  P17: "Pokopia Completionist Kit",
  P18: "Pokopia Complete Player System",
};

export function getProductName(productId: string): string {
  return PRODUCT_NAMES[productId] ?? productId;
}
