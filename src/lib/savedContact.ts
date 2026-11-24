const SAVED_CONTACT_KEY = "solarvy_saved_contact";

export type SavedContact = {
  fullName: string;
  phoneNumber: string;
  email: string;
};

/** Convert E.164 / stored phone to a local Nigeria display string (0…). */
export function phoneLocalFromE164(phoneE164?: string | null): string {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length >= 13) {
    return `0${digits.slice(3, 13)}`;
  }
  if (digits.length === 10) return `0${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (!digits) return "";
  return digits.slice(-10).length === 10
    ? `0${digits.slice(-10)}`
    : digits;
}

export function loadSavedContact(): SavedContact | null {
  try {
    const raw = localStorage.getItem(SAVED_CONTACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedContact>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      fullName: String(parsed.fullName || "").trim(),
      phoneNumber: String(parsed.phoneNumber || "").trim(),
      email: String(parsed.email || "").trim(),
    };
  } catch {
    return null;
  }
}

export function saveSavedContact(contact: {
  fullName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
}): void {
  const next: SavedContact = {
    fullName: String(contact.fullName || "").trim(),
    phoneNumber: String(contact.phoneNumber || "").trim(),
    email: String(contact.email || "").trim().toLowerCase(),
  };
  if (!next.fullName && !next.phoneNumber && !next.email) return;

  try {
    const prev = loadSavedContact();
    localStorage.setItem(
      SAVED_CONTACT_KEY,
      JSON.stringify({
        fullName: next.fullName || prev?.fullName || "",
        phoneNumber: next.phoneNumber || prev?.phoneNumber || "",
        email: next.email || prev?.email || "",
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}
