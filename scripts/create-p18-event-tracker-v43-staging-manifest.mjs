import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const prior = resolve("assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260913.json");
const next = resolve("assets/fulfillment/pokopia/complete-player-system/p18-staged-delivery-manifest-20260918.json");
const root = "pokopia/p18-complete-player-system/P18_V2_24_99_EVENT_TRACKER_V43_STAGED/";
const manifest = JSON.parse(await readFile(prior, "utf8"));

manifest.approval = "2026-09-18 approved Event Tracker v4.3 Letter/A4 replacement; all other components unchanged";
manifest.storageUploadStatus = "not-uploaded";
for (const file of manifest.files) {
  file.logicalDeliveryPath = root + file.logicalDeliveryPath.split("/").at(-1);
  if (file.component !== "Event Tracker") continue;
  file.sourceFamily = "P13-v4.3";
  if (file.format === "US Letter") {
    file.sourcePath = "PRODUCTS/POKOPIA/P13_Event_Tracker_v2/assets/pdf/pokopia-event-tracker-letter.pdf";
    file.bytes = 29065350;
    file.sha256 = "1AC49D5FEBCE17F1D41C40605D99B16131D360C685398234F226FBE1909BB36B";
  } else {
    file.sourcePath = "PRODUCTS/POKOPIA/P13_Event_Tracker_v2/assets/pdf/pokopia-event-tracker-a4.pdf";
    file.bytes = 30487078;
    file.sha256 = "1A7D6030524675666AE18DBB8CB619081BB279B6957CF6CD23D348F8EBE34956";
  }
}
await writeFile(next, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(next);
