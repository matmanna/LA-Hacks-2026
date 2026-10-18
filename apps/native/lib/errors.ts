import { ENV } from "../src/env";

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (/network request failed|fetch failed/i.test(error.message)) {
      return `Can't reach BetterBill at ${ENV.EXPO_PUBLIC_SERVER_URL}. Is the web server running with --host?`;
    }
    return error.message;
  }
  return "Something went wrong on our side. Try again in a moment.";
}
