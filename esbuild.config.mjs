import { build, context } from "esbuild";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

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
  try {
    await readFile(srcCss, "utf8"); // throws if missing
    await copyFile(srcCss, outCss);
  } catch {
    // If you don’t keep a styles.css yet, silently skip
  }
}

if (isWatch) {
  // Use esbuild's incremental rebuild via context, plus a trivial CSS copier
  const ctx = await context({
    entryPoints: [srcEntry],
    outfile: outMain,
    bundle: true,
    format: "cjs",
    platform: "browser",
    target: "es2021",
    sourcemap: true,
    legalComments: "none",
    logLevel: "info",
    minify: false,
    treeShaking: true,
    external: ["obsidian", "@codemirror/*"]  // provided by the app at runtime
  });

  await ctx.watch();

  // naive CSS watcher
  const { watch } = await import("node:fs");
  try {
    await mkdir(dirname(outCss), { recursive: true });
    await copyFile(srcCss, outCss);
  } catch {}
  watch(srcCss, { persistent: true }, async () => {
    try {
      await copyFile(srcCss, outCss);
      console.log("[esbuild] Copied styles.css");
    } catch {}
  });

  console.log("[esbuild] Watching for changes…");
} else {
  await doBuild();
}
