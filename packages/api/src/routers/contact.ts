import { ORPCError } from "@orpc/server";

import { publicProcedure } from "../index";
import { CaseIdInput, ContactSetInput } from "../inputs";
import { Contact } from "../outputs";
import { addEvent, getCaseRow } from "../repo/cases";
import { saveContact, savedPatientPhone } from "../services/contact";

type Db = Parameters<typeof getCaseRow>[0];

async function contactFor(db: Db, caseId: string, userId?: string) {
  const row = await getCaseRow(db, caseId);
  if (!row) throw new ORPCError("NOT_FOUND", { message: "Case not found." });
  return {
    patientPhone: row.patientPhone,
    billingPhone: row.billingPhone,
    hospitalUrl: row.hospitalUrl,
    savedPatientPhone: await savedPatientPhone(db, userId, caseId),
    hospitalName: row.hospitalName,
  };
}

export const contactRouter = {
  get: publicProcedure
    .input(CaseIdInput)
    .output(Contact)
    .handler(({ input, context }) =>
      contactFor(context.db, input.caseId, context.session?.user.id),
    ),

  set: publicProcedure
    .input(ContactSetInput)
    .output(Contact)
    .handler(async ({ input, context }) => {
      const { caseId, ...fields } = input;
      if (!(await getCaseRow(context.db, caseId)))
        throw new ORPCError("NOT_FOUND", { message: "Case not found." });
      await saveContact(context.db, caseId, fields);
      // The numbers themselves stay out of the timeline.
      await addEvent(
        context.db,
        caseId,
        "contact.saved",
        "Call details saved",
        {
          actor: "user",
        },
      );
      return contactFor(context.db, caseId, context.session?.user.id);
    }),
};
