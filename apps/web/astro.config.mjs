import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { esmExternalRequirePlugin } from "rolldown/plugins";
export default defineConfig({
  site: "https://tomo-site.page",
  output: "server",
  trailingSlash: "never",
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react()],
  session: false,
  build: { inlineStylesheets: "never" },
  vite: {
    // sanitize-html/PostCSS use Node built-ins through CommonJS; Workers need ESM imports.
    plugins: [esmExternalRequirePlugin({ external: ["path", "url", "fs"] })],
    build: { cssCodeSplit: true },
  },
});
