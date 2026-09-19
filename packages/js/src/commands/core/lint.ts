import { FS } from "./fs.js";

import { PackageJSON } from "./package.json.js";

export async function eslint(
  fs: FS.Writer,
  pm: PackageJSON,
  ts: boolean,
  cf: string[],
) {
  await pm.devDependency("eslint");
  await pm.devDependency("@eslint/js");
    if (ts) {await pm.devDependency("typescript-eslint") ; await pm.devDependency("typescript", "6.0.3")};
  pm.script("lint", "eslint");
  fs.write(
    "eslint.config.mjs",
    `
import eslint from "@eslint/js"${ts ? "\nimport teslint from 'typescript-eslint'" : ""}
export default [
eslint.configs.recommended${ts ? ",\nteslint.configs.recommended" : ""}${",\n"+cf.join(",\n")}
]`,
  );
}
