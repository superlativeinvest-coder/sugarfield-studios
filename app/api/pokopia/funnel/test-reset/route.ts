import { NextResponse } from "next/server";
import { isCumulativeCheckoutEnabled } from "@/lib/pokopia-funnel/cumulative";

const JOURNEY_COOKIE = "sf_pokopia_journey";

// This is intentionally a local staging-test harness, not a customer route.
// It gives browser automation an isolated journey without altering a completed
// test customer's persisted history.
export async function GET(): Promise<Response> {
  if (process.env.NEXT_PUBLIC_STAGING_AUTH_TEST !== "true" || !isCumulativeCheckoutEnabled()) return new NextResponse(null, { status: 404 });
  const response = NextResponse.json({ reset: true });
  response.cookies.set(JOURNEY_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
