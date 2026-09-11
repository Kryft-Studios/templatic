#!/usr/bin/env node

import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
    readFileSync(
        new URL("./package.json", import.meta.url),
        "utf8"
    )
);

const entryPoints = Object.values(pkg.exports)
    .map(entry => entry.code)
    .filter(Boolean);

if (entryPoints.length === 0) {
    entryPoints.push("./src/index.ts");
}

await build({
    entryPoints,
    outdir: "dist",
    bundle: false,
    minify: true,
    format: "esm",
    entryNames: "[name]",
    sourcemap: false
});
