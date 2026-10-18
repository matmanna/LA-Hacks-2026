import { Polar } from "@polar-sh/sdk";

type PolarServer = "sandbox" | "production";

// Sandbox by default: Polar usage is demo-only today, and a sandbox token
// cannot touch the production organization. Production is opt-in.
const DEFAULT_SERVER: PolarServer = "sandbox";

export function createPolarClient(config: {
  POLAR_ACCESS_TOKEN: string;
  POLAR_SERVER?: string;
}) {
  const server: PolarServer =
    config.POLAR_SERVER === "production" ? "production" : DEFAULT_SERVER;
  return new Polar({
    accessToken: config.POLAR_ACCESS_TOKEN,
    server,
  });
}
