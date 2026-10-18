// Shared by the client and server init. No DSN means Sentry stays disabled.
// BetterBill handles bill text and photos: never send request bodies, cookies,
// headers, or user info.
type ScrubbableEvent = {
  request?: {
    data?: unknown;
    cookies?: unknown;
    headers?: unknown;
    query_string?: unknown;
  };
  user?: unknown;
};

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    event.request.data = undefined;
    event.request.cookies = undefined;
    event.request.headers = undefined;
    event.request.query_string = undefined;
  }
  event.user = undefined;
  return event;
}

export const baseSentryOptions = {
  sendDefaultPii: false,
  dataCollection: { userInfo: false },
  tracesSampleRate: 1.0,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,
};
