import test from "node:test";
import assert from "node:assert/strict";
import { resolveCheckoutOrigin } from "@/lib/http/checkout-origin";

const environment = { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://www.cozygamesguides.com", CHECKOUT_ALLOWED_ORIGINS: "https://www.cozygamesguides.com,https://validate.cozygamesguides.com" };

test("checkout origin accepts only the public and restricted validation origins", () => {
  assert.equal(resolveCheckoutOrigin(new Request("https://internal.vercel.app/api/checkout", { headers: { "x-forwarded-host": "validate.cozygamesguides.com", "x-forwarded-proto": "https" } }), environment), "https://validate.cozygamesguides.com");
  assert.equal(resolveCheckoutOrigin(new Request("https://www.cozygamesguides.com/api/checkout"), environment), "https://www.cozygamesguides.com");
  assert.throws(() => resolveCheckoutOrigin(new Request("https://evil.example/api/checkout"), { ...environment, NEXT_PUBLIC_SITE_URL: undefined }), /not allowlisted/);
});
