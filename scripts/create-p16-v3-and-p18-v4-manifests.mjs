import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const p16Version = "P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED";
const p16Root = `pokopia/p16-adventure-companion/${p16Version}/`;
const p18Version = "P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED";
const p18Root = `pokopia/p18-complete-player-system/${p18Version}/`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const pair = (component, letter, a4) => [
  { component, format: "US Letter", sourcePath: letter },
  { component, format: "A4", sourcePath: a4 },
];

async function withIntegrity(file) {
  const bytes = await readFile(file.sourcePath);
  return { ...file, bytes: bytes.length, sha256: sha256(bytes) };
}

async function main() {
  const p16Files = [
    ...pair("Daily Reset", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P06-Pokopia-Daily-Reset-US-Letter.pdf", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P06-Pokopia-Daily-Reset-A4.pdf"),
    ...pair("Event Tracker", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P13-Pokopia-Event-Tracker-US-Letter.pdf", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P13-Pokopia-Event-Tracker-A4.pdf"),
    ...pair("Spawn Tracker", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P15-Pokopia-Spawn-Tracker-US-Letter.pdf", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P15-Pokopia-Spawn-Tracker-A4.pdf"),
    ...pair("Cloud Islands Planner", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P14-Pokopia-Cloud-Islands-Planner-US-Letter.pdf", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P14-Pokopia-Cloud-Islands-Planner-A4.pdf"),
    ...pair("Field Guide", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P05-Pokopia-Field-Guide-US-Letter.pdf", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P05-Pokopia-Field-Guide-A4.pdf"),
    ...pair("Adventure Dashboard", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/us-letter/P16-Pokopia-Adventure-Dashboard-US-Letter.pdf", "PRODUCTS/POKOPIA/P16_Adventure_Companion/package/a4/P16-Pokopia-Adventure-Dashboard-A4.pdf"),
  ].map((file) => ({ ...file, logicalDeliveryPath: `${p16Root}${file.sourcePath.split("/").pop()}` }));
  const p16Manifest = {
    schemaVersion: 1,
    productId: "P16",
    productName: "Pokopia Adventure Companion",
    status: "staged-not-deployed",
    deliveryMapStatus: "staged-not-active",
    storageUploadStatus: "not-uploaded",
    packageVersion: p16Version,
    pdfCount: 12,
    componentCount: 6,
    files: await Promise.all(p16Files.map(withIntegrity)),
  };
  const p16Path = "assets/fulfillment/pokopia/adventure-companion/p16-v3-customer-delivery-manifest-20260919.json";
  await mkdir(dirname(p16Path), { recursive: true });
  await writeFile(p16Path, `${JSON.stringify(p16Manifest, null, 2)}\n`);

  const priorPath = "assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260918-event-tracker-approved.json";
  const prior = JSON.parse(await readFile(priorPath, "utf8"));
  const replacements = new Map(p16Manifest.files.filter((file) => ["Event Tracker", "Spawn Tracker", "Cloud Islands Planner"].includes(file.component)).map((file) => [`${file.component}:${file.format}`, file]));
  const p18Files = await Promise.all(prior.files.map(async (file) => {
    const replacement = replacements.get(`${file.component}:${file.format}`);
    const next = replacement ? {
      ...file,
      sourceFamily: "P16-v3",
      sourcePath: replacement.sourcePath,
      bytes: replacement.bytes,
      sha256: replacement.sha256,
    } : file;
    return { ...next, logicalDeliveryPath: `${p18Root}${next.logicalDeliveryPath.split("/").pop()}` };
  }));
  const p18Manifest = {
    ...prior,
    status: "staged-not-deployed",
    approval: "2026-09-19 approved P16 V3 customer-delivery refresh; Event Tracker, Spawn Tracker, and Cloud Islands Planner updated; all other components unchanged",
    packageVersion: p18Version,
    storageUploadStatus: "not-uploaded",
    deliveryMapStatus: "staged-not-active",
    files: p18Files,
  };
  const p18Path = "assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260919-p16-v3-refresh.json";
  await writeFile(p18Path, `${JSON.stringify(p18Manifest, null, 2)}\n`);
  console.log(JSON.stringify({ p16Path, p18Path, p16Files: p16Manifest.files.length, p18Files: p18Files.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
