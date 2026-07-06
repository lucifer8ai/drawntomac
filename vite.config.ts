import { defineConfig, mergeConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Plain Vite config (no Lovable build/runtime dependency).
// Mirrors what @lovable.dev/vite-tanstack-config used to set up for this app:
//   - Tailwind v4 + tsconfig path aliases (@/ -> src/)
//   - TanStack Start's Vite plugin (SSR entry -> src/server.ts)
//   - Nitro, only for production builds, so `npm run build` still emits a deployable server
//   - React plugin
export default defineConfig(async ({ command }) => {
  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    viteReact(),
  ];

  // Nitro is only needed to produce the production server build; importing it
  // during `vite dev` is unnecessary and slows down cold start.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: "node-server" }));
  }

  return mergeConfig(
    {
      resolve: {
        alias: {
          "@": `${process.cwd()}/src`,
        },
        dedupe: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "@tanstack/react-query",
          "@tanstack/query-core",
        ],
      },
      server: {
        host: true,
        port: 8080,
      },
    },
    { plugins },
  );
});
