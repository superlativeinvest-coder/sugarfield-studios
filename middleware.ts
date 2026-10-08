import { NextRequest, NextResponse } from "next/server";
import { isReleaseGateExemptPath, normalizeValidationHost, RELEASE_VALIDATION_COOKIE, releaseValidationCookieValue, requestHost, timingSafeTextEqual } from "@/lib/release-validation";

export async function middleware(request: NextRequest) {
  const validationHost = normalizeValidationHost(process.env.RELEASE_VALIDATION_HOST);
  const host = requestHost(request.headers);
  if (!validationHost || host !== validationHost || isReleaseGateExemptPath(request.nextUrl.pathname)) return NextResponse.next();

  const tokenHash = process.env.RELEASE_VALIDATION_TOKEN_HASH?.trim().toLowerCase();
  const cookie = request.cookies.get(RELEASE_VALIDATION_COOKIE)?.value ?? "";
  const expected = tokenHash ? await releaseValidationCookieValue(tokenHash, validationHost) : "";
  if (expected && timingSafeTextEqual(cookie, expected)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const accessUrl = request.nextUrl.clone();
  accessUrl.pathname = "/release-access";
  accessUrl.search = "";
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
