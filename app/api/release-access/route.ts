import { NextResponse } from "next/server";
import { normalizeValidationHost, RELEASE_VALIDATION_COOKIE, releaseValidationCookieValue, requestHost, sha256Hex, timingSafeTextEqual } from "@/lib/release-validation";

export async function POST(request: Request): Promise<Response> {
  const validationHost = normalizeValidationHost(process.env.RELEASE_VALIDATION_HOST);
  const host = requestHost(request.headers);
  const expectedTokenHash = process.env.RELEASE_VALIDATION_TOKEN_HASH?.trim().toLowerCase();
  if (!validationHost || host !== validationHost || !expectedTokenHash) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string" || body.token.length < 16 || body.token.length > 512) return NextResponse.json({ error: "Invalid release token." }, { status: 401 });
  const submittedHash = await sha256Hex(body.token);
  if (!timingSafeTextEqual(submittedHash, expectedTokenHash)) return NextResponse.json({ error: "Invalid release token." }, { status: 401 });

  const response = NextResponse.json({ ok: true, nextRoute: "/pokopia/start" });
  response.cookies.set(RELEASE_VALIDATION_COOKIE, await releaseValidationCookieValue(expectedTokenHash, validationHost), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 4 * 60 * 60,
  });
  return response;
}
