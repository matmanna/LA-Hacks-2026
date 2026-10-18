// Services the "Before you go" tab can compare across hospitals' published
// price files (data/hospitals/*/capture.json). Plain names, grade 6 to 8.
export type PriceService = {
  code: string;
  name: string;
  what: string;
};

export const SERVICES: readonly PriceService[] = [
  {
    code: "72148",
    name: "MRI of the lower back, no contrast",
    what: "A detailed scan of the lower spine, done without dye.",
  },
  {
    code: "85025",
    name: "Blood count (CBC with differential)",
    what: "A common blood test that counts each type of blood cell.",
  },
  {
    code: "99284",
    name: "ER visit, level 4 (moderate)",
    what: "The hospital's fee for an ER visit that needs a moderate workup.",
  },
  {
    code: "70450",
    name: "CT scan of the head, no contrast",
    what: "A quick X-ray scan of the head, done without dye.",
  },
];
