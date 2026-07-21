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
    // Silence the default 500 kB warning and split heavy vendor code so no
    // single JS chunk dominates initial load. Route-level code splitting is
    // handled by React.lazy in src/App.tsx; this handles vendor deps.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Order matters: check more-specific packages first.
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@tanstack")) return "vendor-tanstack";
          if (id.includes("@supabase") || id.includes("/supabase-js")) return "vendor-supabase";
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
          // Heavy office/PDF libs — only pulled in by admin export routes.
          if (id.includes("/xlsx/") || id.includes("node_modules/xlsx")) return "vendor-xlsx";
          if (id.includes("/exceljs")) return "vendor-exceljs";
          if (id.includes("/jspdf") || id.includes("html2canvas")) return "vendor-jspdf";
          if (
            id.includes("react-markdown") ||
            id.includes("/remark") ||
            id.includes("/rehype") ||
            id.includes("/micromark") ||
            id.includes("/mdast") ||
            id.includes("/hast") ||
            id.includes("/unist") ||
            id.includes("/unified") ||
            id.includes("gray-matter")
          ) return "vendor-markdown";
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("zod")
          ) return "vendor-forms";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "vendor-dates";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("embla-carousel")) return "vendor-carousel";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (
            id.includes("react-router") ||
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          ) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
}));
