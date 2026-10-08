import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.staging.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const separator = line.indexOf("=");
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
const auth = Buffer.from(`${env.STRIPE_SECRET_KEY}:`).toString("base64");
const event = await fetch("https://api.stripe.com/v1/events/evt_1UK34MFsZqGu70GuhJgNobFF", { headers: { Authorization: `Basic ${auth}` } }).then((response) => response.json());
const payloadPath = "replay-staging-webhook.json";
const payload = JSON.stringify(event);
writeFileSync(payloadPath, payload, "utf8");
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
console.log(JSON.stringify({ payloadPath, signature: `t=${timestamp},v1=${signature}` }));
