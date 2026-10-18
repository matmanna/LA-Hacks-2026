import { saveCase } from "@/lib/cases";
import { client } from "@/utils/orpc";

// The synthetic demo bill judges and first-time visitors can open without a
// photo (section 14.2). Creates the case on the server and remembers it on
// this phone; the caller decides where to go next.
export const SAMPLE_ID = "SB-01";

export async function startSampleBill(): Promise<string> {
  const { id } = await client.case.create({ sample: SAMPLE_ID });
  await saveCase({
    id,
    createdAt: new Date().toISOString(),
    label: `Sample bill ${SAMPLE_ID} (synthetic)`,
  });
  return id;
}
