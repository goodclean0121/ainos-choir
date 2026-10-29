import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const src = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  resolve: {
    alias: [
      { find: "next/link", replacement: fileURLToPath(new URL("./link.tsx", import.meta.url)) },
      { find: /^@\//, replacement: src + "/" },
    ],
  },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
