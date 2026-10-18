import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  // Release and environment for the browser SDK (Vite only exposes VITE_*).
  define: {
    "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    ),
    "import.meta.env.VITE_SENTRY_ENVIRONMENT": JSON.stringify(
      process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || "",
    ),
  },
  plugins: [
    varlockVitePlugin({ ssrInjectMode: "resolved-env" }),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    // Must stay last. Uploads source maps only when org, project and token are
    // all set; otherwise it is skipped.
    ...(process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
      ? [
          sentryTanstackStart({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: process.env.VERCEL_GIT_COMMIT_SHA
              ? { name: process.env.VERCEL_GIT_COMMIT_SHA }
              : undefined,
            // data-sentry-component attributes make replays searchable by
            // component name. Bill content is still blocked, see SENTRY.md.
            reactComponentAnnotation: { enabled: true },
          }),
        ]
      : []),
  ],
  // These deployments run the standalone build artifact. Build only: in dev,
  // inlining everything makes Vite's SSR runner evaluate React's CommonJS
  // entry and every route fails with "module is not defined".
  ssr: command === "build" ? { noExternal: true } : undefined,
}));
