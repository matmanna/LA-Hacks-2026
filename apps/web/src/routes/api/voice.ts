import { handleVoiceRequest } from "@betterbill/api/services/conference";
import { createFileRoute } from "@tanstack/react-router";

import { db } from "../../services";

export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: { POST: ({ request }) => handleVoiceRequest(db, request) },
  },
});
