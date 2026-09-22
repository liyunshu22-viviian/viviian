import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Served from https://<owner>.github.io/viviian/ (GitHub Pages project site),
// so all built asset URLs need the repo name as a base path.
export default defineConfig({
  base: "/viviian/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        babelTower: resolve(__dirname, "babel-tower.html"),
        voyageLog: resolve(__dirname, "voyage-log.html"),
      },
    },
  },
});
