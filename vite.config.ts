import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.BASE_PATH || "/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Broshfit",
        short_name: "Broshfit",
        description: "Your personal fitness space.",
        theme_color: "#0b1016",
        background_color: "#0b1016",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}pwa-192x192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}pwa-512x512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
});
