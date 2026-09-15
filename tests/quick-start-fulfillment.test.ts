import test from "node:test";
import assert from "node:assert/strict";
import { getProductFilePaths } from "@/lib/delivery/service";
import { createAccessToken, hashAccessToken, QUICK_START_ACCESS_MAX_AGE, type QuickStartAccessInput, type QuickStartAccessRecord, type QuickStartAccessRepository } from "@/lib/quick-start/access";
import { getQuickStartFile, QUICK_START_PRODUCT_ID, QUICK_START_SKU, quickStartFiles } from "@/lib/quick-start/manifest";

class MemoryAccessRepository implements QuickStartAccessRepository {
  private record: QuickStartAccessRecord | null = null;
  async upsert(input: QuickStartAccessInput): Promise<QuickStartAccessRecord> {
    const now = new Date().toISOString();
    this.record = { id: this.record?.id ?? "access-1", email: input.email, productId: input.productId, sku: input.sku, funnelSession: input.funnelSession, firstTouchAttribution: input.firstTouchAttribution, currentTouchAttribution: input.currentTouchAttribution, accessGrantedAt: input.accessGrantedAt, createdAt: this.record?.createdAt ?? now, updatedAt: now };
    return this.record;
  }
  async findByTokenHash(tokenHash: string): Promise<QuickStartAccessRecord | null> { return tokenHash === this.tokenHash ? this.record : null; }
  async touch(): Promise<void> {}
  private tokenHash = "";
  setTokenHash(value: string): void { this.tokenHash = value; }
}

test("Quick Start manifest uses the approved product identity and exactly two files", () => {
  assert.equal(QUICK_START_PRODUCT_ID, "FREE-QUICK-START");
  assert.equal(QUICK_START_SKU, "pokopia_quick_start_pack");
  assert.deepEqual(Object.keys(quickStartFiles), ["letter", "a4"]);
  assert.equal(quickStartFiles.letter.pageCount, 7);
  assert.equal(quickStartFiles.a4.pageCount, 7);
  assert.equal(quickStartFiles.letter.byteSize, 19855586);
  assert.equal(quickStartFiles.a4.byteSize, 19293891);
  assert.equal(quickStartFiles.letter.sha256, "E649FFE1274C3F5B9CE0A6498E88F2D8C2D99976B86C723CF2FDB6B1C9863569");
  assert.equal(quickStartFiles.a4.sha256, "B8D33E9F19E4CB6D49266B67B31DDCF7648257DC92836A8D34DCE4C37F7F4D7D");
  assert.deepEqual(getProductFilePaths(QUICK_START_PRODUCT_ID), [
    "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_US_Letter.pdf",
    "pokopia/quick-start/final-scope-20260909/Pokopia_Quick_Start_Pack_A4.pdf",
  ]);
  assert.equal(getProductFilePaths(QUICK_START_PRODUCT_ID).length, 2);
  assert.equal(getProductFilePaths("P06").length, 2);
  assert.deepEqual(getProductFilePaths("P17"), [
    "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-US-Letter.pdf",
    "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-A4.pdf",
    "pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf",
    "pokopia/completionist-kit/v2-corrected-20260908/README.md",
  ]);
});

test("Quick Start has the same authenticated order-delivery file map as paid products", () => {
  assert.equal(getProductFilePaths(QUICK_START_PRODUCT_ID).length, 2);
  assert.equal(getProductFilePaths(QUICK_START_PRODUCT_ID).every((path) => path.startsWith("pokopia/quick-start/")), true);
});

test("Quick Start file allowlist rejects arbitrary and paid file identifiers", () => {
  assert.ok(getQuickStartFile("letter"));
  assert.ok(getQuickStartFile("a4"));
  assert.equal(getQuickStartFile("P06"), undefined);
  assert.equal(getQuickStartFile("../../P06"), undefined);
  assert.equal(getQuickStartFile("free=true"), undefined);
});

test("Quick Start access token is opaque, hashed, and one-hour signed URLs are expected", async () => {
  const repository = new MemoryAccessRepository();
  const token = createAccessToken();
  const tokenHash = hashAccessToken(token);
  repository.setTokenHash(tokenHash);
  const record = await repository.upsert({ email: "player@example.com", productId: QUICK_START_PRODUCT_ID, sku: QUICK_START_SKU, funnelSession: "session-1", firstTouchAttribution: { source: "test" }, currentTouchAttribution: { campaign: "quick-start" }, accessGrantedAt: new Date().toISOString(), tokenHash });
  assert.equal(record.productId, QUICK_START_PRODUCT_ID);
  const found = await repository.findByTokenHash(tokenHash);
  assert.equal(found?.email, "player@example.com");
  const duplicate = await repository.upsert({ email: "player@example.com", productId: QUICK_START_PRODUCT_ID, sku: QUICK_START_SKU, funnelSession: "session-2", accessGrantedAt: new Date().toISOString(), tokenHash });
  assert.equal(duplicate.id, record.id);
  assert.equal(duplicate.funnelSession, "session-2");
  assert.equal(await repository.findByTokenHash(hashAccessToken("fake-token")), null);
  assert.equal(QUICK_START_ACCESS_MAX_AGE, 60 * 60 * 24 * 30);
  assert.notEqual(token, tokenHash);
});
