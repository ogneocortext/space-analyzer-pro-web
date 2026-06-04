import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    cors: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Disable CSS minification to avoid Tailwind CSS v4 warnings
    cssMinify: false,
  },
  optimizeDeps: {
    force: true,
    include: ["vue"],
  },
});
