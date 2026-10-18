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
  {
    code: "72100",
    name: "X-ray of the lower back",
    short: "X-ray lower back",
    what: "Pictures of the lower spine, 2 or 3 views.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: [
      "xray back",
      "x ray back",
      "back xray",
      "lumbar xray",
      "spine xray",
    ],
  },
  {
    code: "71046",
    name: "Chest X-ray, 2 views",
    short: "Chest X-ray",
    what: "Pictures of the lungs and heart from two angles.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: ["chest xray", "chest x ray", "lung xray", "cxr"],
  },
  {
    code: "76700",
    name: "Ultrasound of the belly",
    short: "Belly ultrasound",
    what: "A sound-wave scan of the organs in your belly, like the liver and kidneys.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: [
      "ultrasound",
      "abdominal ultrasound",
      "abdomen ultrasound",
      "belly ultrasound",
      "sonogram",
    ],
  },
  {
    code: "74177",
    name: "CT of the belly and pelvis, with contrast",
    short: "CT belly and pelvis",
    what: "A detailed X-ray scan of the belly and pelvis, done with dye.",
    notCovered:
      "Not the radiologist who reads it, or the dye when it is billed as its own line.",
    terms: [
      "ct abdomen",
      "ct belly",
      "ct pelvis",
      "abdominal ct",
      "ct abdomen pelvis",
      "cat scan belly",
    ],
  },
  {
    code: "73721",
    name: "MRI of a leg joint, no contrast",
    short: "MRI knee",
    what: "A detailed scan of one leg joint, such as the knee or ankle, done without dye.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: ["mri knee", "knee mri", "ankle mri", "hip mri", "leg joint mri"],
  },
  {
    code: "77067",
    name: "Screening mammogram",
    short: "Mammogram",
    what: "A routine X-ray of both breasts to check for cancer.",
    notCovered:
      "Not the radiologist who reads it. They usually send a separate bill.",
    terms: ["mammogram", "breast xray", "breast screening", "mammo"],
  },
  {
    code: "80053",
    name: "Metabolic panel (CMP)",
    short: "Metabolic panel",
    what: "A blood test that checks your kidneys, liver, sugar and salts.",
    notCovered:
      "Not other tests or the blood draw, when they are billed as separate lines.",
    terms: [
      "metabolic panel",
      "cmp",
      "comprehensive metabolic panel",
      "blood test",
      "blood work",
      "labs",
      "kidney test",
      "liver test",
    ],
  },
];
