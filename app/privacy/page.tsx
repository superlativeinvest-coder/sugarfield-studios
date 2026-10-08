import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Disclosure | Sugarfield Studio",
  description: "Sugarfield Studio privacy and advertising technology disclosure.",
};

export default function PrivacyPage() {
  return (
    <main className="site-section legal-page">
      <div className="site-container legal-page__content">
        <p className="eyebrow">Privacy disclosure</p>
        <h1>How Sugarfield handles analytics and advertising technology</h1>
        <p>This page describes the current implementation. It is not legal advice or a substitute for a jurisdiction-specific privacy review.</p>
        <h2>First-party operational analytics</h2>
        <p>The funnel uses first-party operational analytics to understand whether pages and funnel actions work. This system is separate from TikTok advertising consent and remains governed by the site&apos;s approved operational analytics policy.</p>
        <h2>Advertising Pixel</h2>
        <p>When enabled in an approved environment, the TikTok Pixel is an advertising technology that may receive standard funnel events. In production, it does not load unless the visitor grants advertising consent and the production environment is explicitly configured. Rejecting or withdrawing advertising consent prevents future Pixel dispatch.</p>
        <h2>Consent storage</h2>
        <p>The site stores the advertising choice in the browser&apos;s first-party local storage under a versioned consent key. The site does not use this consent mechanism to infer identity, and the Pixel integration does not send email, order authority, entitlements, or other protected purchase data.</p>
        <h2>Questions and review</h2>
        <p>Before production advertising activation, the owner should confirm the final privacy notice, consent wording, retention details, regional requirements, and any consent-manager or legal-review requirements for the audiences served.</p>
      </div>
    </main>
  );
}
