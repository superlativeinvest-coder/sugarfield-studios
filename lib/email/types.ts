export type EmailSignupRequest = { email: string };

export interface EmailProvider {
  subscribe(email: string): Promise<void>;
}
