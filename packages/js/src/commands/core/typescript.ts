import { FS } from "./fs.js";
import { Git } from "./gitmgr.js";
import { PackageJSON } from "./package.json.js";

export async function tsConfig(
  rootDir: string,
  distDir: string,
  node: boolean,
  declarations: boolean,
  types: string[],
  tslib: string[],
  strict: boolean,
  tsconfigExts: string[],
  tsconfigext: string,
  tsconfigIsSpread: boolean,
  fs: FS.Writer,
  pm: PackageJSON,
  target: string,
) {
  for (const p of types) {
   await  pm.devDependency(p);
  }
  const tsconfig = JSON.stringify({
    extends: [
      ...tsconfigExts,
      ...(!tsconfigIsSpread ? ["./tsext.tsconfig.json"] : []),
    ],
    include: [`${rootDir}/**/*.ts`],
    compilerOptions: {
      strict,
      declaration: declarations,
      types,
      lib: [...tslib, ...(!node ? ["DOM"] : [])],
      rootDir,
      outDir: distDir,
      target,
      moduleResolution: node ? "nodenext" : "bundler",
      module: node ? "nodenext" : target,
    },
    ...(tsconfigIsSpread ? JSON.parse(tsconfigext) : {}),
  });
  fs.write("tsconfig.json", tsconfig);
  if (tsconfigIsSpread) return;
  fs.write("tsext.tsconfig.json", tsconfigext);
}
