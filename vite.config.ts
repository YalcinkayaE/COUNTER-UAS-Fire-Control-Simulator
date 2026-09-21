import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Serve public/rubik/index.html for /rubik and /rubik/ (Vite SPA fallback otherwise wins). */
function rubikPublicIndex(): Plugin {
  return {
    name: "rubik-public-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/rubik" || req.url === "/rubik/") {
          req.url = "/rubik/index.html";
        }
        if (req.url === "/cube" || req.url === "/cube/") {
          req.url = "/rubik/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), rubikPublicIndex()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: false,
    proxy: {
      // Rubik prototype API (python -m rubik.cli serve on :8765)
      "/solve": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
