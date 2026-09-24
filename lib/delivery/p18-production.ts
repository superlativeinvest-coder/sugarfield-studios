import { getStagedP18PackageFiles, type P18StagedFile } from "./p18-staged";

/** Production promotion of the approved P18 V4 package. */
export const P18_PRODUCTION_FULFILLMENT_VERSION = "P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919";

export function getProductionP18PackageFiles(): P18StagedFile[] {
  return getStagedP18PackageFiles().map((file) => ({
    ...file,
    logicalDeliveryPath: file.logicalDeliveryPath.replace(
      "P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED",
      P18_PRODUCTION_FULFILLMENT_VERSION,
    ),
  }));
}
