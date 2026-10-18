// A short label for a hospital on a map pin: "Providence Saint John's
// Health Center" -> "Saint John's". Display only; lists keep the full name.
export function shortHospitalName(name: string) {
  return name
    .replace(/^Providence[- ]/, "")
    .replace(
      /\s*\b(Medical Center|Health Center|Med Center|Hospital)\b\s*/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .replace(/^Cedars Sinai (?=Tarzana)/, "")
    .trim();
}
