import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      // Forward all /api/* requests to the Express backend
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
