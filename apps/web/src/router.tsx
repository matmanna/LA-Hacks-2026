import { Button } from "@betterbill/ui/components/button";
import * as Sentry from "@sentry/tanstackstart-react";
import {
  createRouter as createTanStackRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { useEffect } from "react";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { createQueryClient, orpc } from "./utils/orpc";

// Plain-language fallback. The error goes to Sentry; nothing about the bill
// is attached.
function RouteError({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="mx-auto max-w-xl space-y-4 px-5 py-16">
      <h1 className="font-semibold text-[28px] leading-[34px]">
        Something went wrong
      </h1>
      <p className="text-muted-foreground">
        We have been told about it. Your bill was not changed. Try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}

// Names the user flow on every event, from the route.
function flowOf(pathname: string) {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/check")) return "check";
  if (pathname.startsWith("/packet")) return "packet";
  if (/^\/case\/[^/]+\/confirm/.test(pathname)) return "confirm";
  if (/^\/case\/[^/]+\/activity/.test(pathname)) return "activity";
  if (pathname.startsWith("/case/")) return "results";
  return "other";
}

export const getRouter = () => {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: { orpc, queryClient },
    defaultPendingComponent: () => <Loader />,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: () => <div>Not Found</div>,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  if (!router.isServer) {
    Sentry.setTag("bb.flow", flowOf(router.state.location.pathname));
    router.subscribe("onResolved", ({ toLocation }) => {
      Sentry.setTag("bb.flow", flowOf(toLocation.pathname));
    });
    Sentry.addIntegration(
      Sentry.tanstackRouterBrowserTracingIntegration(router),
    );
  }

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
