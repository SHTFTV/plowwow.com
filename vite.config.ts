import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: { main: path.resolve(__dirname, "index.html"), "calculator-runtime": path.resolve(__dirname, "src/simple-calculator.mjs") },
      output: { entryFileNames: (chunk) => chunk.name === "calculator-runtime" ? "calculator-runtime.js" : "assets/[name]-[hash].js" },
    },
  },
}));

