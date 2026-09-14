import type { EmailSignupRequest } from "./types";

export function validateEmailSignup(value: unknown): EmailSignupRequest | null {
  if (!value || typeof value !== "object" || !("email" in value) || typeof value.email !== "string") return null;
  const email = value.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { email };
}
