import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Serve public/rubik/index.html for /rubik and /rubik/ (Vite SPA fallback otherwise wins). */
function rubikPublicIndex(): Plugin {
  return {
    name: "rubik-public-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split("?")[0];
        if (path === "/rubik" || path === "/rubik/") {
          req.url = "/rubik/index.html";
        }
        if (path === "/cube" || path === "/cube/") {
          req.url = "/rubik/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.RUBIK_API_PORT || process.env.RUBIK_API_PORT || "8765";
  const apiTarget = `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [react(), tailwindcss(), rubikPublicIndex()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      // Fail loudly instead of silently moving to 5174 (breaks the documented URL).
      strictPort: true,
      proxy: {
        "/solve": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
