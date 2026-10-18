import { Polar } from "@polar-sh/sdk";

export type PolarServer = "sandbox" | "production";

export function createPolarClient(config: {
  POLAR_ACCESS_TOKEN: string;
  POLAR_SERVER?: PolarServer;
}) {
  return new Polar({
    accessToken: config.POLAR_ACCESS_TOKEN,
    server: config.POLAR_SERVER ?? "sandbox",
  });
}
