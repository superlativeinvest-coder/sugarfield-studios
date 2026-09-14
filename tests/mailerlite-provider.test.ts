import assert from "node:assert/strict";
import test from "node:test";
import { MailerLiteEmailProvider } from "@/lib/email/provider";

test("MailerLite upserts a subscriber into the configured group", async () => {
  let url = "";
  let init: RequestInit | undefined;
  const provider = new MailerLiteEmailProvider("test-api-key", "quick-start-group", async (input, options) => {
    url = String(input);
    init = options;
    return new Response(JSON.stringify({ data: { id: "subscriber-1" } }), { status: 201 });
  });

  await provider.subscribe("player@example.com");

  assert.equal(url, "https://connect.mailerlite.com/api/subscribers");
  assert.equal(init?.method, "POST");
  assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-api-key");
  assert.deepEqual(JSON.parse(String(init?.body)), { email: "player@example.com", groups: ["quick-start-group"] });
});

test("MailerLite failures prevent a false signup success", async () => {
  const provider = new MailerLiteEmailProvider("test-api-key", "quick-start-group", async () => new Response(JSON.stringify({ message: "Unauthenticated." }), { status: 401 }));
  await assert.rejects(() => provider.subscribe("player@example.com"), /MailerLite subscriber upsert failed \(401\)/);
});
