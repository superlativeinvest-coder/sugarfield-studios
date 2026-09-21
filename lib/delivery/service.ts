import type { DeliveryProvider, Entitlement, SecureDownload } from "./types";
import { P18_STAGED_FULFILLMENT_VERSION, getStagedP18PackageFiles } from "./p18-staged";
import { P16_V3_FULFILLMENT_VERSION, getP16V3PackageFiles } from "./p16-v3-staged";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getQuickStartFile, type QuickStartFileId } from "@/lib/quick-start/manifest";

export function getDeliveryProvider(): DeliveryProvider | null {
  return getSupabaseServerClient() ? new SupabaseStorageDeliveryProvider() : null;
}

const productFiles: Record<string, string[]> = {
  P06: ["pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf", "pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf"],
  P13: [
    // P13 standalone delivery reuses the approved 2026-09-18 Event Tracker
    // objects already verified in the staged P16 V3 package. The legacy
    // mini-tool path is retained only in historical manifests.
    "pokopia/p16-adventure-companion/P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED/P13-Pokopia-Event-Tracker-A4.pdf",
    "pokopia/p16-adventure-companion/P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED/P13-Pokopia-Event-Tracker-US-Letter.pdf",
  ],
  P16: ["pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf", "pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf", "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf", "pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf"],
  P17: ["pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-US-Letter.pdf", "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-A4.pdf", "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf", "pokopia/completionist-kit/v2-corrected-20260908/README.md"],
  "FREE-QUICK-START": ["pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf", "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf"],
};

export const P16_LEGACY_FULFILLMENT_VERSION = "P16_LEGACY_7_99";
export const P16_V2_FULFILLMENT_VERSION = "P16_V2_19_99";
export { P16_V3_FULFILLMENT_VERSION } from "./p16-v3-staged";
const p16V2Files = [
  "pokopia/p16-adventure-companion/p06-daily-reset-letter.pdf",
  "pokopia/p16-adventure-companion/p06-daily-reset-a4.pdf",
  "pokopia/p16-adventure-companion/p13-event-tracker-letter.pdf",
  "pokopia/p16-adventure-companion/p13-event-tracker-a4.pdf",
  "pokopia/p16-adventure-companion/p15-spawn-tracker-letter.pdf",
  "pokopia/p16-adventure-companion/p15-spawn-tracker-a4.pdf",
  "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf",
  "pokopia/p16-adventure-companion/v2-optimized/p14-v2-proof-20260908-153100/P14-Pokopia-Cloud-Islands-Planner-A4.pdf",
  "pokopia/p16-adventure-companion/p05-field-guide-letter.pdf",
  "pokopia/p16-adventure-companion/p05-field-guide-a4.pdf",
  "pokopia/p16-adventure-companion/p16-adventure-dashboard-letter.pdf",
  "pokopia/p16-adventure-companion/p16-adventure-dashboard-a4.pdf",
];

export function getProductFilePaths(productId: string, fulfillmentVersion?: string): string[] {
  if (productId === "P16" && fulfillmentVersion === P16_V2_FULFILLMENT_VERSION) return [...p16V2Files];
  if (productId === "P16" && fulfillmentVersion === P16_V3_FULFILLMENT_VERSION) return getP16V3PackageFiles().map((file) => file.logicalDeliveryPath);
  // This versioned map is intentionally unreachable until the P18 feature
  // gates and a verified webhook grant are enabled in a later promotion.
  if (productId === "P18" && fulfillmentVersion === P18_STAGED_FULFILLMENT_VERSION) return getStagedP18PackageFiles().map((file) => file.logicalDeliveryPath);
  return productFiles[productId] ? [...productFiles[productId]] : [];
}

export async function createQuickStartSignedDownload(fileId: QuickStartFileId): Promise<SecureDownload | null> {
  const client = getSupabaseServerClient();
  const file = getQuickStartFile(fileId);
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
  if (!client || !file || !bucket) return null;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(file.storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error(`Could not create Quick Start download: ${error?.message ?? "No signed URL returned."}`);
  return { url: data.signedUrl, expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), downloads: [{ name: file.customerFilename, url: data.signedUrl, expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() }] };
}

class SupabaseStorageDeliveryProvider implements DeliveryProvider {
  async createSecureDownload(entitlement: Entitlement): Promise<SecureDownload> {
    const client = getSupabaseServerClient();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "digital-products";
    if (!client || !bucket) throw new Error("Supabase Storage is not configured.");
    const paths = getProductFilePaths(entitlement.productId, entitlement.fulfillmentVersion);
    if (!paths?.length) throw new Error("No fulfillment files are configured for this product.");
    const downloads = await Promise.all(paths.map(async (path) => {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw new Error(`Could not create secure download: ${error?.message ?? "No signed URL returned."}`);
      return { name: path.split("/").pop() ?? "download", url: data.signedUrl, expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() };
    }));
    return { url: downloads[0].url, expiresAt: downloads[0].expiresAt, downloads };
  }
}

// A durable entitlement store, authenticated customer context, and private
// object-storage provider are required before any file can be served.
export async function createSecureDownload(_entitlement: Entitlement, _provider: DeliveryProvider | null): Promise<SecureDownload | null> {
  if (!_provider) return null;
  return _provider.createSecureDownload(_entitlement);
}
