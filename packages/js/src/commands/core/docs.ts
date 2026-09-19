import { FS } from "./fs.js";
import { deepSpread } from "./helpers/deepSpreader.js";
import { PackageJSON } from "./package.json.js";

export async function docs(
  typedocPlugins: string[],
  src: string,
  docsDist: string,
  typedocConfig: Record<any, any>,
  fs: FS.Writer,
  pm: PackageJSON,
) {
    await pm.devDependency("typedoc");
    await pm.devDependency("typescript", "6.0.3")
  for (const dep of typedocPlugins) {
    await pm.devDependency(dep);
  }
  fs.write(
    "typedoc.json",
    JSON.stringify(deepSpread(
      {
        entryPoints: [`${src}/index.ts`],
        out: docsDist,
        plugins: typedocPlugins,
      },
      typedocConfig,
    ), undefined ,1));
}
