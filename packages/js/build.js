#!/usr/bin/env node

import { build } from "esbuild";
import { execSync } from "node:child_process";
import { globSync, readFileSync } from "node:fs";
const entryPoints =globSync("src/**/*.ts")
await build({
    entryPoints,
    outdir: "dist",
    bundle: false,
    minify: true,
    format: "esm",
    entryNames: "[dir]/[name]",
    sourcemap: false,
});
//execSync("tsc --emitDeclarationOnly")