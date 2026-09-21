import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const previous = resolve("assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260918.json");
const output = resolve("assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260918-event-tracker-approved.json");
const root = "pokopia/p18-complete-player-system/P18_V3_24_99_EVENT_TRACKER_APPROVED_20260918_STAGED/";
const manifest = JSON.parse(await readFile(previous, "utf8"));

manifest.approval = "2026-09-18 approved four-page Event Tracker replacement; all other components unchanged";
manifest.storageUploadStatus = "not-uploaded";
for (const file of manifest.files) {
  file.logicalDeliveryPath = root + file.logicalDeliveryPath.split("/").at(-1);
  if (file.component !== "Event Tracker") continue;
  file.sourceFamily = "P13-approved-20260918";
  if (file.format === "US Letter") {
    file.sourcePath = "PRODUCTS/POKOPIA/P13_Event_Tracker_v2/assets/pdf/pokopia-event-tracker-letter.pdf";
    file.bytes = 26672611;
    file.sha256 = "2F3042641C598FF8658D943C5CA8759B941109218508BAED44F5DA4D2CFF1F98";
  } else {
    file.sourcePath = "PRODUCTS/POKOPIA/P13_Event_Tracker_v2/assets/pdf/pokopia-event-tracker-a4.pdf";
    file.bytes = 27895477;
    file.sha256 = "9F9210A7D1D418067F57453128C47C627F98B6CE3DD579E5D82773A94C728AE7";
  }
}
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(output);
