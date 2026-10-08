import { NextResponse } from "next/server";
import { isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";

const JOURNEY_COOKIE = "sf_pokopia_journey";

export async function GET(request: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_STAGING_AUTH_TEST !== "true" || !isCumulativeCheckoutEnabled()) return new NextResponse(null, { status: 404 });
  const response = NextResponse.redirect(new URL("/pokopia/daily-reset", request.url));
  response.cookies.set(JOURNEY_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
