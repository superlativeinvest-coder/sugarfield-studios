export type ConsentChoice = "unknown" | "granted" | "denied";

export type SugarfieldConsentState = {
  version: 1;
  analytics: ConsentChoice;
  advertising: ConsentChoice;
  updatedAt: string;
};

export const CONSENT_STORAGE_KEY = "sugarfield_consent_v1";
export const CONSENT_CHANGED_EVENT = "sugarfield:consent-changed";

const defaultConsent: SugarfieldConsentState = {
  version: 1,
  analytics: "unknown",
  advertising: "unknown",
  updatedAt: "",
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage; } catch { return undefined; }
}

function isChoice(value: unknown): value is ConsentChoice {
  return value === "unknown" || value === "granted" || value === "denied";
}

export function normalizeConsentState(value: unknown): SugarfieldConsentState {
  if (!value || typeof value !== "object") return defaultConsent;
  const candidate = value as Partial<SugarfieldConsentState>;
  return {
    version: 1,
    analytics: isChoice(candidate.analytics) ? candidate.analytics : "unknown",
    advertising: isChoice(candidate.advertising) ? candidate.advertising : "unknown",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
  };
}

export function readConsent(storage?: StorageLike): SugarfieldConsentState {
  if (!storage) return { ...defaultConsent };
  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY);
    return raw ? normalizeConsentState(JSON.parse(raw)) : { ...defaultConsent };
  } catch {
    return { ...defaultConsent };
  }
}

export function hasAdvertisingConsent(state?: SugarfieldConsentState): boolean {
  return (state ?? readConsent(browserStorage())).advertising === "granted";
}

export function saveConsent(state: Pick<SugarfieldConsentState, "analytics" | "advertising">, storage?: StorageLike): SugarfieldConsentState {
  const next = normalizeConsentState({ ...state, updatedAt: new Date().toISOString() });
  const target = storage ?? browserStorage();
  try {
    target?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Consent is fail-closed for advertising if storage is unavailable.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SugarfieldConsentState>(CONSENT_CHANGED_EVENT, { detail: next }));
  }
  return next;
}

export function setAdvertisingConsent(choice: Exclude<ConsentChoice, "unknown">): SugarfieldConsentState {
  const current = readConsent(browserStorage());
  return saveConsent({ analytics: current.analytics, advertising: choice });
}
