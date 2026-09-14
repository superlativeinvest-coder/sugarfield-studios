import { createHash, randomBytes } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { QUICK_START_PRODUCT_ID } from "./manifest";

export const QUICK_START_ACCESS_COOKIE = "sugarfield_quick_start_access";
export const QUICK_START_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

export type QuickStartAttribution = Record<string, string>;
export type QuickStartAccessRecord = {
  id: string;
  email: string;
  productId: string;
  sku: string;
  funnelSession?: string;
  firstTouchAttribution?: QuickStartAttribution;
  currentTouchAttribution?: QuickStartAttribution;
  accessGrantedAt: string;
  createdAt: string;
  updatedAt: string;
  lastAccessAt?: string;
};
export type QuickStartAccessInput = Omit<QuickStartAccessRecord, "id" | "createdAt" | "updatedAt" | "lastAccessAt"> & { tokenHash: string };

export interface QuickStartAccessRepository {
  upsert(input: QuickStartAccessInput): Promise<QuickStartAccessRecord>;
  findByTokenHash(tokenHash: string): Promise<QuickStartAccessRecord | null>;
  touch(id: string): Promise<void>;
}

type AccessRow = {
  id: string;
  email: string;
  product_id: string;
  sku: string;
  funnel_session: string | null;
  first_touch_attribution: QuickStartAttribution | null;
  current_touch_attribution: QuickStartAttribution | null;
  access_granted_at: string;
  created_at: string;
  updated_at: string;
  last_access_at: string | null;
};

function toRecord(row: AccessRow): QuickStartAccessRecord { return { id: row.id, email: row.email, productId: row.product_id, sku: row.sku, funnelSession: row.funnel_session ?? undefined, firstTouchAttribution: row.first_touch_attribution ?? undefined, currentTouchAttribution: row.current_touch_attribution ?? undefined, accessGrantedAt: row.access_granted_at, createdAt: row.created_at, updatedAt: row.updated_at, lastAccessAt: row.last_access_at ?? undefined }; }

class SupabaseQuickStartAccessRepository implements QuickStartAccessRepository {
  async upsert(input: QuickStartAccessInput): Promise<QuickStartAccessRecord> {
    const client = getSupabaseServerClient();
    if (!client) throw new Error("Supabase access storage is not configured.");
    const now = new Date().toISOString();
    const { data: existing, error: existingError } = await client.from("free_product_access").select("funnel_session,first_touch_attribution,current_touch_attribution").eq("email", input.email).eq("product_id", input.productId).maybeSingle();
    if (existingError) throw new Error(`Could not read existing free access record: ${existingError.message}`);
    const { data, error } = await client.from("free_product_access").upsert({ email: input.email, product_id: input.productId, sku: input.sku, funnel_session: input.funnelSession ?? existing?.funnel_session ?? null, first_touch_attribution: input.firstTouchAttribution ?? existing?.first_touch_attribution ?? null, current_touch_attribution: input.currentTouchAttribution ?? existing?.current_touch_attribution ?? null, access_granted_at: input.accessGrantedAt, updated_at: now, access_token_hash: input.tokenHash }, { onConflict: "email,product_id" }).select("*").single();
    if (error || !data) throw new Error(`Could not create free access record: ${error?.message ?? "No access record returned."}`);
    return toRecord(data as AccessRow);
  }
  async findByTokenHash(tokenHash: string): Promise<QuickStartAccessRecord | null> {
    const client = getSupabaseServerClient();
    if (!client) return null;
    const { data, error } = await client.from("free_product_access").select("*").eq("access_token_hash", tokenHash).eq("product_id", QUICK_START_PRODUCT_ID).maybeSingle();
    if (error) throw new Error(`Could not read free access record: ${error.message}`);
    return data ? toRecord(data as AccessRow) : null;
  }
  async touch(id: string): Promise<void> {
    const client = getSupabaseServerClient();
    if (!client) return;
    const { error } = await client.from("free_product_access").update({ last_access_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(`Could not update free access record: ${error.message}`);
  }
}

export function getQuickStartAccessRepository(): QuickStartAccessRepository | null { return getSupabaseServerClient() ? new SupabaseQuickStartAccessRepository() : null; }
export function createAccessToken(): string { return randomBytes(32).toString("base64url"); }
export function hashAccessToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
