import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: { port: 8080, host: true, strictPort: true },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // server.entry redirects TanStack Start's bundled server entry to src/server.ts
    // (our SSR error wrapper); nitro/vite build from this.
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
  ],
});
