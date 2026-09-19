import {
  command_config,
  Commands,
  options_config,
  parsed_options,
  parsed_positionals,
  positionals_config,
} from "@templatic/core";
import path, { normalize } from "node:path";
import { PathHelpers } from "../core/path.js";
import { Net } from "../core/net.js";
import { Interactive } from "../core/interactive.js";
import { FS } from "../core/fs.js";
import { PackageJSON } from "../core/package.json.js";
import { tsConfig } from "../core/typescript.js";
import { checkIsObject } from "../core/helpers/checkIsObject.js";
import { Builder } from "../core/builder.js";
import { eslint } from "../core/lint.js";
import { docs } from "../core/docs.js";
import {Git} from "../core/gitmgr.js"
import { it } from "node:test";
import { execSync } from "node:child_process";
export class SinglePackage {
  async exec(
    posits: parsed_positionals<(typeof SinglePackage)["POSITIONALS"]>,
    options: parsed_options<(typeof SinglePackage)["OPTIONS"]>,
  ) {
    process.chdir(PathHelpers.dir(options.in));
    const name = normalize(posits[0] as string);
    const src = PathHelpers.dir(options.src);
    const dist = PathHelpers.dir(options.dist);
    const interactor = new Interactive(options.prompts);
    const writer = new FS.Writer(options.force);
    if (options.clear) PathHelpers.clearDir(options.in);
    writer.mkdir(src);
    writer.mkdir(dist);
    const pkManagr = new PackageJSON(
      name,
      options.version,
      options.in,
      options.packageManager,
      options.description,
      options.private,
      options.type,
    );
    for (const a of options.dep) {
      await pkManagr.dependency(a as string)
    }
   await  tsConfig(
      options.src,
      options.dist,
      options.node,
      options.tsconfigDeclare,
      options.types as string[],
      options.tslib as string[],
      options.tsconfigStrict,
      options.tsconfigExtensions as string[],
      options.tsconfigExt,
      options.tsconfigExtIsSpread,
      writer,
      pkManagr,
      options.target,
    );
    writer.write(
      `${src}/index.${options.ts ? "ts" : "js"}`,
      `
/**
 * The name of this package.${
   options.ts
     ? ""
     : `
 * @type {string}`
 }
*/
export const NAME${options.ts ? ":string " : ""}="${name}";`,
    );
   await Builder.handle(
      options.builder as ("swc" | "terser" | "esbuild" | "tsc")[],
      JSON.parse(options.esbuildConfig),
      options.dist,
      options.src,
      options.ts,
      options.terserConfig,
      JSON.parse(options.swcConfig),
      pkManagr,
      writer,
    );
    if (options.lint)
   await   eslint(writer, pkManagr, options.ts, options.eslintConfig as string[]);
    if (options.docs)
    await  docs(
        options.typedocPlugin as string[],
        src,
        PathHelpers.dir(options.docsdist),
        JSON.parse(options.typedocConfig),
        writer,
        pkManagr,
      );
    if (options.git) {
      Git.init(options.gitcfg as string[]);
      Git.writeGitIgnore(writer, options.gitIgnoreGeneration);
      Git.branchName(options.mainBranchName);
      Git.remotes(options.remotes as string[]);
    }
    await pkManagr.generateCode(writer);
    execSync(`${options.packageManager} install`)
  }
}
export namespace SinglePackage {
  export const OPTIONS = {
    tsconfigExtensions: {
      type: "array",
      arrayMemberType: { type: "string" },
      default: [],
      description: "Paths to extensions for tsconfig",
      conflicts: [
        {
          if: false,
          for: "ts",
        },
      ],
    },
    docsdist: {
      type: "string",
      default: "docs-dist",
    },
    target: {
      type: "union",
      unionMembers: new Set([
        "esnext",
        "es3",
        "es5",
        "es6",
        "es2015",
        "es2016",
        "es2017",
        "es2018",
        "es2019",
        "es2020",
        "es2021",
        "es2022",
        "es2025",
        "es2026",
        "es2023",
        "es2024",
      ] as const),
      default: "esnext",
      conflicts: [{ if: false, for: "ts" }],
    },
    tsconfigStrict: {
      type: "boolean",
      default: true,
      conflicts: [{ if: false, for: "ts" }],
    },
    tsconfigExtIsSpread: {
      type: "boolean",
      default: false,
      conflicts: [{ if: false, for: "ts" }],
    },
    tsconfigDeclare: {
      type: "boolean",
      default: true,
      conflicts: [
        {
          for: "ts",
          if: false,
        },
      ],
    },
    private: {
      type: "boolean",
      description: "Whether the package is private.",
      default: false,
      conflicts: [{ if: false, for: "packageJSON" }],
    },
    types: {
      type: "array",
      description: "The types included in tsconfig.json",
      arrayMemberType: {
        type: "custom",
        async fn(value) {
          return Net.ok(
            `https://registry.npmjs.org/${encodeURIComponent(value as string)}`,
          );
        },
      },
      default: [],
      conflicts: [{ for: "ts", if: false }],
    },
    description: {
      type: "string",
      description: "The description of the package",
      default: "",
      conflicts: [
        {
          if: false,
          for: "packageJSON",
        },
      ],
    },
    version: {
      type: "regexp",
      regexp: /\d+\.\d+\.\d+/,
      default: "0.0.0",
      description: "The initial version of the packae",
      conflicts: [{ if: false, for: "packageJSON" }],
    },
    in: {
      type: "string",
      description: "The directory in which the package is created.",
      default: ".",
    },
    packageManager: {
      type: "union",
      unionMembers: new Set(["yarn", "pnpm", "npm"] as const),
      description: "The package manager",
      default: "pnpm",
    },
    dep: {
      type: "array",
      arrayMemberType: {
        type: "custom",
        async fn(value) {
          return Net.ok(
            `https://registry.npmjs.org/${encodeURIComponent(value as string)}`,
          );
        },
      },
      description: "Initial dependencies",
      default: [],
    },
    builder: {
      type: "array",
      arrayMemberType: {
        type: "union",
        unionMembers: new Set(["esbuild", "tsc", "terser", "swc"] as const),
      },
      short: "B",
      default: ["tsc", "esbuild"],
      description: "Builder to use.",
      conflicts: [
        {
          for: "ts",
          if: false,
          ifIAm: "tsc",
          on: "error",
        },
      ],
    },
    esbuildConfig: {
      type: "custom",
      fn: checkIsObject,
      default: "{}",
    },
    terserConfig: {
      type: "custom",
      fn: checkIsObject,
      default: "{}",
    },
    swcConfig: {
      type: "custom",
      fn: checkIsObject,
      default: "{}",
    },

    dist: {
      type: "string",
      short: "D",
      default: "dist",
      description: "Distribution directory.",
      conflicts: [
        {
          for: "ts",
          if: false,
          ifIAm: true,
          on: "warn",
        },
        { for: "packageJSON", if: false, on: "error" },
      ],
    },

    node: {
      type: "boolean",
      default: false,
      description: "Enable Node.js support.",
      conflicts: [
        {
          for: "dom",
          if: true,
          ifIAm: true,
          on: "error",
        },
      ],
    },

    dom: {
      type: "boolean",
      default: true,
      description: "Enable DOM support.",
    },

    type: {
      type: "union",
      unionMembers: new Set(["commonjs", "module"] as const),
      default: "module",
      description: "Package module type.",
      conflicts: [{ for: "packageJSON", if: false }],
    },

    lint: {
      type: "boolean",
      short: "L",
      default: true,
      description: "Enable linting.",
      conflicts: [
        {
          for: "packageJSON",
          if: false,
          ifIAm: true,
        },
      ],
    },

    tslib: {
      type: "array",
      arrayMemberType: { type: "string" },
      default: [],
      description: "TypeScript libraries.",
      conflicts: [
        {
          for: "ts",
          if: false,
          ifIAm: true,
        },
      ],
    },

    git: {
      type: "boolean",
      short: "G",
      default: true,
      description: "Initialize Git.",
    },

    remotes: {
      type: "array",
      arrayMemberType: {
        type: "custom",
        fn: Net.ok,
      },
      short: "R",

      default: [],
      description: "Git remotes.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    mainBranchName: {
      type: "string",
      default: "main",
      description: "Main branch name.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    initialCommit: {
      type: "string",
      default: "[auto-generated by @templatic/js] Initial Commit",
      description: "Initial Git commit message.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    gitIgnoreGeneration: {
      type: "boolean",
      default: true,
      description: "Generate a .gitignore.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    gitcfg: {
      type: "array",
      arrayMemberType: { type: "regexp", regexp: /.*\=.*/g },
      default: [],
      description: "Git configuration entries.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    githubFeature: {
      type: "array",
      arrayMemberType: {
        type: "union",
        unionMembers: new Set([
          "lint-workflow",
          "docs-workflow",
          "releases",
          "issue-templates",
          "pull-request-templates",
        ] as const),
      },
      default: [],
      description: "GitHub features.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    gitlabFeature: {
      type: "array",
      arrayMemberType: {
        type: "union",
        unionMembers: new Set([
          "lint-workflow",
          "releases",
          "issue-templates",
          "pull-request-templates",
        ] as const),
      },
      default: [],
      description: "GitLab features.",
      conflicts: [
        {
          for: "git",
          if: false,
        },
      ],
    },

    src: {
      type: "string",
      default: "src",
      description: "Source directory.",
    },

    mds: {
      type: "array",
      arrayMemberType: {
        type: "union",
        unionMembers: new Set(["readme", "contributing", "changelog"] as const),
      },
      default: ["readme"],
      description: "Markdown documents to generate.",
    },

    docs: {
      type: "boolean",
      default: true,
      description: "Enable documentation generation.",
      conflicts: [
        {
          for: "ts",
          if: false,
          on: "error",
        },
        {
          for: "packageJSON",
          if: false,
        },
      ],
    },

    typedocPlugin: {
      type: "array",
      arrayMemberType: { type: "string" },
      default: [],
      description: "TypeDoc plugins.",
      conflicts: [
        {
          for: "docs",
          if: false,
        },
        {
          for: "packageJSON",
          if: false,
        },
      ],
    },
    typedocConfig: {
      type: "custom",
      fn: checkIsObject,
      default: "{}",
    },

    docsOut: {
      type: "string",
      default: "docs",
      description: "Documentation output directory.",
      conflicts: [
        {
          for: "docs",
          if: false,
        },
      ],
    },

    ts: {
      type: "boolean",
      short: "T",
      default: true,
      description: "Enable TypeScript.",
      conflicts: [
        {
          for: "packageJSON",
          if: false,
          on: "error",
        },
      ],
    },
    eslintConfig: {
      type: "array",
      arrayMemberType: { type: "custom", fn: checkIsObject },
      default: [],
    },

    tsconfigExt: {
      type: "custom",
      fn(t) {
        try {
          JSON.parse(t as string);
          return true;
        } catch (e) {
          return false;
        }
      },
      default: "{}",
      description: "Additional tsconfig configuration.",
      conflicts: [{ for: "ts", if: false }],
    },

    packageJSON: {
      type: "boolean",
      default: true,
      description: "Generate package.json.",
    },

    prompts: {
      type: "boolean",
      default: true,
      description: "Enable interactive prompts.",
    },

    force: {
      type: "boolean",
      short: "F",
      default: false,
      description: "Allow overwriting existing files",
    },

    clear: {
      type: "boolean",
      default: true,
      description: "Clear existing generated contents.",
      conflicts: [
        {
          for: "force",
          if: false,
        },
      ],
    },
  } satisfies options_config;
  export const POSITIONALS: positionals_config = [
    {
      type: "string",
    },
  ];
}
export const SINGLE_PACKAGE: command_config<
  (typeof SinglePackage)["OPTIONS"],
  typeof SinglePackage.POSITIONALS
> = {
  positionalsConfig: SinglePackage.POSITIONALS,
  options: SinglePackage.OPTIONS,
  description: "Creates a single JS/TS package",
  class: SinglePackage,
};
