import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { rememberDeviceCase } from "@/lib/device-cases";
import { client } from "@/utils/orpc";

const SAMPLE_ID = "SB-01";

export function useStartSample() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const created = await client.case.create({ sample: SAMPLE_ID });
      rememberDeviceCase(created.id);
      await navigate({ to: "/case/$id/confirm", params: { id: created.id } });
    } catch {
      setError("Something went wrong on our side. Try again in a moment.");
      setPending(false);
    }
  }

  return { start, pending, error };
}
