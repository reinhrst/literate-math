import { build } from "esbuild";
import { readFile, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths
const srcEntry = resolve(__dirname, "src", "main.ts");
const outMain = resolve(__dirname, "main.js");
const srcCss = resolve(__dirname, "src", "styles.css");
const outCss = resolve(__dirname, "styles.css");

// Build function
async function doBuild() {
  await build({
    entryPoints: [srcEntry],
    outfile: outMain,
    bundle: true,
    format: "cjs",          // Obsidian expects CJS
    platform: "browser",
    target: "es2021",
    sourcemap: true,
    legalComments: "none",
    logLevel: "info",
    minify: false,
    treeShaking: true,
    external: ["obsidian", "@codemirror/*"]  // provided by the app at runtime
  });

  // ensure root dir exists (it does), then copy CSS
  await readFile(srcCss, "utf8"); // throws if missing
  await copyFile(srcCss, outCss);
}

await doBuild();
