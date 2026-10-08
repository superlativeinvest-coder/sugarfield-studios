function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getCheckoutAllowedOrigins(environment: Record<string, string | undefined> = process.env): string[] {
  return [...new Set((environment.CHECKOUT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value)))];
}

export function resolveCheckoutOrigin(request: Request, environment: Record<string, string | undefined> = process.env): string {
  const allowed = getCheckoutAllowedOrigins(environment);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestUrl = new URL(request.url);
  const candidate = normalizeOrigin(forwardedHost
    ? `${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}`
    : requestUrl.origin);

  if (candidate && allowed.includes(candidate)) return candidate;

  const configured = environment.NEXT_PUBLIC_SITE_URL ? normalizeOrigin(environment.NEXT_PUBLIC_SITE_URL) : null;
  if (configured && allowed.includes(configured)) return configured;

  // Local development remains usable without weakening deployed environments.
  if (environment.NODE_ENV !== "production" && candidate && ["localhost", "127.0.0.1"].includes(new URL(candidate).hostname)) return candidate;
  throw new Error("Checkout return origin is not allowlisted.");
}
