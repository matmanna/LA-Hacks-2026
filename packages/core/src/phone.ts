// Phone numbers and hospital website addresses typed by a patient. Pure
// helpers: parsing and display only. Whether a number may be dialed is
// decided by isDialableNumber (call.ts).

// E.164 from what a person types. US numbers need no country code. Returns
// null when it can't be a real number.
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw || /[^\d\s()+.-]/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (digits.length === 10 && /^[2-9]/.test(digits)) return `+1${digits}`;
  if (digits.length === 11 && /^1[2-9]/.test(digits)) return `+${digits}`;
  return null;
}

// "+14155550123" as "(415) 555-0123". Other countries stay in E.164.
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

// A hospital website as an https URL. Adds https:// when missing. Rejects
// other schemes, logins in the address, and hosts that aren't public names.
export function normalizeHospitalUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname;
  if (
    !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host) ||
    /^\d+(\.\d+){3}$/.test(host)
  )
    return null;
  url.protocol = "https:";
  url.hash = "";
  return url.toString();
}
