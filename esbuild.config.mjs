import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "build");

const isWatch = process.argv.includes("--watch");

/** simple helper to copy styles.css alongside main.js into /build if you ever switch to importing CSS */
async function copyCss() {
  const src = resolve(__dirname, "styles.css");
  const dstDir = outdir;
  const dst = resolve(dstDir, "styles.css");
  try {
    await mkdir(dstDir, { recursive: true });
    const css = await readFile(src, "utf8");
    await writeFile(dst, css, "utf8");
  } catch {
    // no-op if CSS not present yet
  }
}

await build({
  entryPoints: ["main.ts"],
  outfile: "build/main.js",
  bundle: true,
  format: "cjs", // Obsidian expects CJS plugin bundle
  platform: "browser",
  target: "es2021",
  sourcemap: true,
  legalComments: "none",
  logLevel: "info",
  minify: false,
  treeShaking: true,
  external: ["obsidian"] // provided by the app
});

await copyCss();

if (isWatch) {
  console.log("Watching for changes…");
}
