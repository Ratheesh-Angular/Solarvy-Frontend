import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        // Bill OCR can take several seconds; avoid premature proxy cutoffs (502).
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
  build: {
    // LightningCSS fails on minifying concatenated Bootstrap + Icons (@keyframes).
    cssMinify: "esbuild",
  },
});
