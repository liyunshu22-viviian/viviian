import { defineConfig } from "vite";

// Served from https://<owner>.github.io/viviian/ (GitHub Pages project site),
// so all built asset URLs need the repo name as a base path.
export default defineConfig({
  base: "/viviian/",
});
