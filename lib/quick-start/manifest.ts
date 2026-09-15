export const QUICK_START_PRODUCT_ID = "FREE-QUICK-START";
export const QUICK_START_SKU = "pokopia_quick_start_pack";

export const quickStartFiles = {
  letter: {
    id: "letter",
    customerFilename: "Pokopia_Quick_Start_Pack_US_Letter.pdf",
    sourcePath: "PRODUCTS/POKOPIA/Quick_Start_Pack/assets/pdf/final/Pokopia_Quick_Start_Pack_US_Letter.pdf",
    storagePath: "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf",
    sha256: "E649FFE1274C3F5B9CE0A6498E88F2D8C2D99976B86C723CF2FDB6B1C9863569",
    byteSize: 19855586,
    format: "PDF",
    pageCount: 7,
  },
  a4: {
    id: "a4",
    customerFilename: "Pokopia_Quick_Start_Pack_A4.pdf",
    sourcePath: "PRODUCTS/POKOPIA/Quick_Start_Pack/assets/pdf/final/Pokopia_Quick_Start_Pack_A4.pdf",
    storagePath: "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf",
    sha256: "B8D33E9F19E4CB6D49266B67B31DDCF7648257DC92836A8D34DCE4C37F7F4D7D",
    byteSize: 19293891,
    format: "PDF",
    pageCount: 7,
  },
} as const;

export type QuickStartFileId = keyof typeof quickStartFiles;
export function getQuickStartFile(fileId: string) { return Object.prototype.hasOwnProperty.call(quickStartFiles, fileId) ? quickStartFiles[fileId as QuickStartFileId] : undefined; }
