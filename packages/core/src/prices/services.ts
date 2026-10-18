// Services the "Before you go" tab can compare across hospitals' published
// price files (data/hospitals/*/capture.json). Plain names, grade 6 to 8.
export type PriceService = {
  code: string;
  name: string;
  // Chip label on the Prices tab.
  short: string;
  what: string;
  // What the hospital's price leaves out (A2 "What this price covers").
  notCovered: string;
  // Plain words people type for it; matched by searchServices.
  terms: readonly string[];
};

export const SERVICES: readonly PriceService[] = [
  {
    code: "72148",
    name: "MRI of the lower back, no contrast",
    short: "MRI lower back",
    what: "A detailed scan of the lower spine, done without dye.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: [
      "mri back",
      "lower back mri",
      "back mri",
      "lumbar mri",
      "lumbar spine",
      "spine mri",
      "back scan",
    ],
  },
  {
    code: "85025",
    name: "Blood count (CBC with differential)",
    short: "Blood count",
    what: "A common blood test that counts each type of blood cell.",
    notCovered:
      "Not other tests or the blood draw, when they are billed as separate lines.",
    terms: [
      "blood test",
      "blood count",
      "blood work",
      "bloodwork",
      "cbc",
      "complete blood count",
      "labs",
    ],
  },
  {
    code: "99284",
    name: "ER visit, level 4 (moderate)",
    short: "ER visit",
    what: "The hospital's fee for an ER visit that needs a moderate workup.",
    notCovered:
      "Not the ER doctor's own fee, or tests and scans. Those are billed separately.",
    terms: [
      "er visit",
      "er",
      "emergency room",
      "emergency",
      "ed visit",
      "emergency department",
    ],
  },
  {
    code: "70450",
    name: "CT scan of the head, no contrast",
    short: "CT scan of the head",
    what: "A quick X-ray scan of the head, done without dye.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: [
      "ct head",
      "head ct",
      "ct scan",
      "cat scan",
      "head scan",
      "brain scan",
      "ct brain",
    ],
  },
];
