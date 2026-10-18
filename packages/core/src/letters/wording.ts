export const BANNED = [
  "illegal",
  "fraud",
  "fraudulent",
  "overcharge",
  "overcharged",
  "overcharging",
  "scam",
  "lawsuit",
  "sue",
  "attorney",
  "guarantee",
];

export function checkWording(text: string): string[] {
  const problems: string[] = [];
  for (const word of BANNED) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(text)) problems.push(word);
  }
  if (text.includes("—") || text.includes("–")) {
    problems.push("dash");
  }
  return problems;
}
