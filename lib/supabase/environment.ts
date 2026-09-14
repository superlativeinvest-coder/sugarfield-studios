export const PRODUCTION_SUPABASE_PROJECT_REF = "lbbxdvszykxdaytqmqnl";
export const STAGING_SUPABASE_PROJECT_REF = "faxsnbdjzniwyhtnsvfz";

export type SupabaseEnvironment = "LOCAL" | "STAGING" | "PRODUCTION" | "UNKNOWN";

export function projectRefFromSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const host = new URL(value).hostname.toLowerCase();
    const match = /^([a-z0-9-]+)\.supabase\.co$/.exec(host);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export function classifySupabaseTarget(value: string | undefined): SupabaseEnvironment {
  if (!value) return "UNKNOWN";
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return "LOCAL";
  } catch {
    return "UNKNOWN";
  }
  const ref = projectRefFromSupabaseUrl(value);
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) return "PRODUCTION";
  if (ref === STAGING_SUPABASE_PROJECT_REF) return "STAGING";
  return "UNKNOWN";
}

export function assertApprovedStagingSupabaseTarget(value: string | undefined): string {
  const ref = projectRefFromSupabaseUrl(value);
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error(`Refusing staging operation against production Supabase project ${PRODUCTION_SUPABASE_PROJECT_REF}.`);
  }
  if (ref !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error("Refusing staging operation against an unknown Supabase project.");
  }
  return ref;
}
