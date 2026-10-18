// Display formatting only. Savings always come from the server's audit.

// Plain names for common codes, so patients see "Blood draw" instead of
// "VENIPUNCTURE". Anything else keeps the printed text in sentence case.
const PLAIN: Record<string, string> = {
  "99284": "ED visit, level 4",
  "72148": "MRI lower back, no contrast",
  "72100": "X-ray lower back",
  "85025": "Blood count (CBC)",
  "80053": "Metabolic panel",
  "36415": "Blood draw",
  "96374": "IV medicine, one drug",
  J1885: "Pain medicine (ketorolac)",
  J7030: "IV fluids (saline)",
  "81003": "Urine test",
};

export function lineName(line: {
  code: string | null;
  description: string;
  userEdited?: boolean;
}) {
  // A name the user typed wins. Printed descriptions are upper case, so an
  // edited line that kept its printed text still gets the plain name.
  const typed = line.description !== line.description.toUpperCase();
  if (line.userEdited && typed) return line.description;
  const plain = line.code ? PLAIN[line.code] : undefined;
  if (plain) return plain;
  const text = line.description.trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const day = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// "2026-09-14" -> "Sep 14"
export function serviceDay(date: string | null) {
  return date ? day.format(new Date(`${date}T00:00:00Z`)) : null;
}

// Captures are stamped in UTC; the team captured them in Los Angeles.
const capturedFormat = (() => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
  } catch {
    return day;
  }
})();

// "2026-10-18T00:55:12Z" -> "Oct 17"
export function capturedDay(iso: string) {
  return capturedFormat.format(new Date(iso));
}
