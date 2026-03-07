import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.SITE_URL ?? "https://example.com",
  base: process.env.PUBLIC_BASE_PATH ?? "/"
});
