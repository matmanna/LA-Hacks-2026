import { accountProcedure } from "../index";
import {
  BulkCheckoutInput,
  PaymentCheckoutInput,
  PaymentQuoteInput,
} from "../inputs";
import { CheckoutResult, PaymentQuote } from "../outputs";
import {
  createBulkCheckout,
  createSavingsCheckout,
  quotePayment,
} from "../services/payments";

// Gated like approve/send: needs a real account when BB_REQUIRE_ACCOUNT=true.
export const paymentRouter = {
  quote: accountProcedure
    .input(PaymentQuoteInput)
    .output(PaymentQuote)
    .handler(({ input, context }) => quotePayment(context.db, input.caseId)),
  checkout: accountProcedure
    .input(PaymentCheckoutInput)
    .output(CheckoutResult)
    .handler(({ input, context }) => createSavingsCheckout(context.db, input)),
  bulkCheckout: accountProcedure
    .input(BulkCheckoutInput)
    .output(CheckoutResult)
    .handler(({ input }) => createBulkCheckout(input)),
};
