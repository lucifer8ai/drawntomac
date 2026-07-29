import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Standalone Vite config (no Lovable dependency). Re-implements, individually,
// the plugins that @lovable.dev/vite-tanstack-config used to bundle:
//  - tsConfigPaths: resolves the "@/*" import alias from tsconfig.json
//  - tailwindcss: Tailwind v4 Vite plugin
//  - tanstackStart: TanStack Start SSR/router plugin (server entry -> src/server.ts)
//  - viteReact: React fast-refresh support
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // nitro/build target: defaults to a Node server. Change this if you
      // deploy elsewhere (e.g. "cloudflare-module", "vercel", "netlify").
      server: { entry: "server" },
    }),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 8080,
    host: true,
  },
});