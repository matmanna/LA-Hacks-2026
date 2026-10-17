import { appRouter } from "@betterbill/api/routers/index";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { createFileRoute } from "@tanstack/react-router";

import { createContext, isAdapterRequest } from "../../../context";

// Plain JSON API for the Fetch adapter. No .route() on procedures means
// POST /api/v1/<router>/<procedure>. Requires x-bb-adapter-key.
const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

async function handle({ request }: { request: Request }) {
  if (!isAdapterRequest(request)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await apiHandler.handle(request, {
    prefix: "/api/v1",
    context: await createContext({ req: request }),
  });
  if (result.response) return result.response;
  return new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
