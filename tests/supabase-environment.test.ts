import test from "node:test";
import assert from "node:assert/strict";
import { assertApprovedStagingSupabaseTarget, classifySupabaseTarget, PRODUCTION_SUPABASE_PROJECT_REF, STAGING_SUPABASE_PROJECT_REF } from "@/lib/supabase/environment";

test("Supabase target classification and staging guard fail closed", () => {
  assert.equal(classifySupabaseTarget(`https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`), "PRODUCTION");
  assert.equal(classifySupabaseTarget(`https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`), "STAGING");
  assert.equal(classifySupabaseTarget("https://unknown.supabase.co"), "UNKNOWN");
  assert.equal(classifySupabaseTarget("not a url"), "UNKNOWN");
  assert.equal(classifySupabaseTarget(undefined), "UNKNOWN");
  assert.equal(assertApprovedStagingSupabaseTarget(`https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`), STAGING_SUPABASE_PROJECT_REF);
  assert.throws(() => assertApprovedStagingSupabaseTarget(`https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`), /production Supabase project/);
  assert.throws(() => assertApprovedStagingSupabaseTarget("https://unknown.supabase.co"), /unknown Supabase project/);
  assert.throws(() => assertApprovedStagingSupabaseTarget(undefined), /unknown Supabase project/);
});
