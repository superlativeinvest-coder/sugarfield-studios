export const RELEASE_VALIDATION_COOKIE = "sf_release_validation";

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export function normalizeValidationHost(value: string | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim().toLowerCase();
  if (!candidate || candidate.includes("/") || candidate.includes("@") || candidate.includes(" ")) return null;
  return candidate.replace(/:\d+$/, "");
}

export function requestHost(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded ?? headers.get("host");
  return host ? host.toLowerCase().replace(/:\d+$/, "") : null;
}

export async function releaseValidationCookieValue(tokenHash: string, host: string): Promise<string> {
  return sha256Hex(`pokopia-release-v1:${tokenHash.toLowerCase()}:${host.toLowerCase()}`);
}

export function timingSafeTextEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function isReleaseGateExemptPath(pathname: string): boolean {
  return pathname === "/release-access"
    || pathname === "/api/release-access"
    || pathname === "/api/stripe/webhook"
    || pathname === "/auth/callback"
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/assets/")
    || pathname === "/favicon.ico"
    || /\.(?:css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/i.test(pathname);
}
