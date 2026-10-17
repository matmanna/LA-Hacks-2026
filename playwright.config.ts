import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run build && bun run --cwd apps/web serve --port 3001",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180000,
      },
  projects: [
    {
      name: "mobile",
      use: { ...devices["iPhone 14"], defaultBrowserType: "chromium" },
    },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
});
