import type { EmailProvider } from "./types";

const MAILERLITE_SUBSCRIBERS_URL = "https://connect.mailerlite.com/api/subscribers";
const MAILERLITE_REQUEST_TIMEOUT_MS = 10_000;

export class MailerLiteEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly groupId: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async subscribe(email: string): Promise<void> {
    const response = await this.request(MAILERLITE_SUBSCRIBERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // MailerLite's subscriber upsert only adds the group; it does not remove
      // any existing groups when they are omitted from a later request.
      body: JSON.stringify({ email, groups: [this.groupId] }),
      signal: AbortSignal.timeout(MAILERLITE_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`MailerLite subscriber upsert failed (${response.status}).`);
  }
}

export function getEmailProvider(): EmailProvider | null {
  const apiKey = process.env.MAILERLITE_API_KEY?.trim();
  const groupId = process.env.MAILERLITE_GROUP_ID?.trim();
  if (!apiKey || !groupId) return null;
  return new MailerLiteEmailProvider(apiKey, groupId);
}
