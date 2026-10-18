import { ORPCError } from "@orpc/server";

import { publicProcedure } from "../index";
import { CaseIdInput, ContactSetInput } from "../inputs";
import { Contact } from "../outputs";
import { addEvent, claimCase, getCaseRow } from "../repo/cases";
import { saveContact, savedPatientPhone } from "../services/contact";

type Db = Parameters<typeof getCaseRow>[0];

type SessionUser = { id: string; phoneNumber?: string | null } | undefined;

async function contactFor(db: Db, caseId: string, user?: SessionUser) {
  const row = await getCaseRow(db, caseId);
  if (!row) throw new ORPCError("NOT_FOUND", { message: "Case not found." });
  return {
    patientPhone: row.patientPhone,
    billingPhone: row.billingPhone,
    hospitalUrl: row.hospitalUrl,
    savedPatientPhone: await savedPatientPhone(db, user?.id, caseId),
    accountPhone: user?.phoneNumber ?? null,
    signedIn: Boolean(user),
    hospitalName: row.hospitalName,
  };
}

export const contactRouter = {
  get: publicProcedure
    .input(CaseIdInput)
    .output(Contact)
    .handler(({ input, context }) =>
      contactFor(context.db, input.caseId, context.session?.user),
    ),

  set: publicProcedure
    .input(ContactSetInput)
    .output(Contact)
    .handler(async ({ input, context }) => {
      const { caseId, ...fields } = input;
      const row = await getCaseRow(context.db, caseId);
      if (!row)
        throw new ORPCError("NOT_FOUND", { message: "Case not found." });
      // A signed-in patient takes an unclaimed case, so it shows up on all
      // their devices. A case that belongs to someone else is left alone.
      const user = context.session?.user as SessionUser;
      if (user) await claimCase(context.db, caseId, user.id);
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
      return contactFor(context.db, caseId, user);
    }),
};
