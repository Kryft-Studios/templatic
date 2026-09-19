import path from "node:path";
import { FS } from "./fs.js";
import { PackageJSON } from "./package.json.js";
import { deepSpread } from "./helpers/deepSpreader.js";
import { Git } from "./gitmgr.js";

export namespace Builder {
  type builder_name = "esbuild" | "terser" | "swc" | "tsc";

  function json(value: unknown) {
    return JSON.stringify(value);
  }

  export async function handle(
    builders: builder_name[],
    esbuildConfig: Record<string, any>,
    outdir: string,
    srcdir: string,
    ts: boolean,
    terserConfig: string,
    swcConfig: Record<string, any>,
    pm: PackageJSON,
    fs: FS.Writer,
  ) {
    const sourceFile = path.join(
      srcdir,
      `index.${ts ? "ts" : "js"}`,
    );

    Git.addToGitIgnore(["dist"], "output");

    pm.script("build", "node build.mjs");

    /*
     * Dependencies
     */

    for (const builder of new Set(builders)) {
      if (builder === "swc") {
        await pm.devDependency("@swc/core");
      } else if (builder === "tsc") {
        if(!pm.DEV_DEPS["typescript"])await pm.devDependency("typescript");
      } else {
        await pm.devDependency(builder);
      }
    }

    const stages: string[] = [];

    stages.push(`
let files = [${json(sourceFile)}];
`);

    /*
     * Every builder consumes "files".
     *
     * Builders that create new files MUST update "files".
     * Builders that mutate files in-place MUST NOT change "files".
     *
     * Initial:
     *
     *   src/index.ts
     *
     * TSC:
     *
     *   dist/index.js
     *
     * esbuild:
     *
     *   dist/index.js
     *
     * SWC:
     *
     *   dist/index.js
     *
     * Terser:
     *
     *   dist/index.js
     */

    for (const builder of builders) {
      /*
       * TSC
       */

      if (builder === "tsc") {
        stages.push(`
{
  const { createRequire } = await import("node:module");
  const { execFile } = await import("node:child_process");

  const require = createRequire(import.meta.url);
  const tsc = require.resolve("typescript/bin/tsc");

  await new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [
        tsc,
        "--project",
        "tsconfig.json",
        "--outDir",
        ${json(outdir)},
        "--rootDir",
        ${json(srcdir)},
        "--declaration",
        "false",
      ],
      (error, stdout, stderr) => {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);

        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );

    child.on("error", reject);
  });

  files = files.map(file => {
    const relative = path.relative(
      ${json(srcdir)},
      file,
    );

    const extension = path.extname(relative);

    return path.join(
      ${json(outdir)},
      relative.slice(0, -extension.length) + ".js",
    );
  });
}
`);
      }

      /*
       * esbuild
       */

      if (builder === "esbuild") {
        const config = deepSpread(
          {
            entryPoints: [],
            outdir,
            bundle: false,
            minify: true,
            entryNames: "[dir]/[name]",
                sourcemap: false,
            allowOverwrite: true
          },
          esbuildConfig,
        );

        stages.push(`
{
  const { build } = await import("esbuild");

  const config = ${json(config)};

  config.entryPoints = files;

  await build(config);
}
`);
      }

      /*
       * SWC
       */

      if (builder === "swc") {
        stages.push(`
{
  const { transformFile } = await import("@swc/core");
  const { mkdir, writeFile } = await import("node:fs/promises");

  const nextFiles = [];

  for (const file of files) {
    const result = await transformFile(
      file,
      ${json({
        jsc: {
          target: "es2022",
        },
        ...swcConfig,
      })},
    );

    const relative = path.relative(
      ${json(srcdir)},
      file,
    );

    const extension = path.extname(relative);

    const output = path.join(
      ${json(outdir)},
      relative.slice(0, -extension.length) + ".js",
    );

    await mkdir(
      path.dirname(output),
      {
        recursive: true,
      },
    );

    await writeFile(
      output,
      result.code,
      "utf8",
    );

    nextFiles.push(output);
  }

  files = nextFiles;
}
`);
      }

      /*
       * Terser
       */

      if (builder === "terser") {
        stages.push(`
{
  const { minify } = await import("terser");
  const { readFile, writeFile } = await import("node:fs/promises");

  for (const file of files) {
    const content = await readFile(
      file,
      "utf8",
    );

    const result = await minify(
      content,
      ${terserConfig || "{}"},
    );

    if (result.error) {
      throw result.error;
    }

    await writeFile(
      file,
      result.code ?? "",
      "utf8",
    );
  }
}
`);
      }
    }

    fs.write(
      "build.mjs",
      `
import path from "node:path";

${stages.join("\n")}

console.log("Build complete.");
`,
    );
  }
}
