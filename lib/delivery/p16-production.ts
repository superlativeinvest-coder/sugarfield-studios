import { getP16V3PackageFiles, type P16V3File } from "./p16-v3-staged";

/** Production promotion of the approved, hash-locked P16 V3 package. */
export const P16_PRODUCTION_FULFILLMENT_VERSION = "P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919";

export function getProductionP16PackageFiles(): P16V3File[] {
  return getP16V3PackageFiles().map((file) => ({
    ...file,
    logicalDeliveryPath: file.logicalDeliveryPath.replace(
      "P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED",
      P16_PRODUCTION_FULFILLMENT_VERSION,
    ),
  }));
}
