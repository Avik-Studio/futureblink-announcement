import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "path";
import { fileURLToPath } from "url";

// The Shopify CLI sets BACKEND_PORT for the frontend process so it knows
// where the Express backend is running (dynamic port each dev session).
const backendPort = process.env.BACKEND_PORT || 3000;
const proxyTarget = `http://localhost:${backendPort}`;

// Injects the Shopify API key into index.html (App Bridge needs it at load time).
// The Shopify CLI sets SHOPIFY_API_KEY during `dev`, `build` and `deploy`.
function injectApiKey() {
  return {
    name: "inject-shopify-api-key",
    transformIndexHtml(html) {
      return html.replace(
        /%SHOPIFY_API_KEY%/g,
        process.env.SHOPIFY_API_KEY || ""
      );
    },
  };
}

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react(), injectApiKey()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: "localhost",
    port: parseInt(process.env.FRONTEND_PORT || "5173", 10),
    allowedHosts: true,
    // The CLI proxy routes ALL requests to Vite (frontend), so Vite must
    // proxy /api/* back to the Express backend.
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: false,
      },
    },
    hmr: process.env.HMR_HOST
      ? {
          protocol: "wss",
          host: process.env.HMR_HOST,
          port: 443,
          clientPort: 443,
        }
      : undefined,
  },
});
