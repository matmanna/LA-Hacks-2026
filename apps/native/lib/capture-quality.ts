// After-capture "too dark" check from the photo's EXIF. Expo Go can't read live
// camera frames, so this runs on each photo once it's taken.
//
// Calibrated on the team's 35 iPhone photos of printed bills (2026-10-17):
//   bright (flat, angle, crumpled): BrightnessValue 1.89 to 2.52, ISO 125 to 250
//   dim (dim, dimangle):            BrightnessValue -3.65 to -2.69, ISO 1000 to 1250
// Dim photos read 81% of lines vs 100% for flat (data/eval/extraction.json).
// A heuristic from one phone: unknown EXIF never warns.
const MIN_BRIGHTNESS = 0;
const MAX_ISO = 800;

export function isTooDark(exif?: Record<string, unknown> | null): boolean {
  if (!exif) return false;
  const brightness = num(exif.BrightnessValue);
  if (brightness !== null) return brightness < MIN_BRIGHTNESS;
  const iso = num(
    Array.isArray(exif.ISOSpeedRatings)
      ? exif.ISOSpeedRatings[0]
      : (exif.ISOSpeedRatings ?? exif.PhotographicSensitivity),
  );
  return iso !== null && iso >= MAX_ISO;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
