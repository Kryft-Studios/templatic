import { FS } from "./fs.js";
import { Git } from "./gitmgr.js";
import { Net } from "./net.js";

export class PackageJSON {
  constructor(
    public name: string,
    public version: string,
    public rootdir: string,
    public pm: "yarn" | "pnpm" | "npm",
    public description?: string,
    public prvate = false,
    public type?: "module" | "commonjs",
  ) {
    Git.addToGitIgnore(["node_modules"], "ignore modules")
  }
  readonly DEV_DEPS: Record<string, string> = {};
  async dependency(
    name: string,
    version?: string,
    va: Record<string, string> = this.DEPS,
  ) {
    va[name] = version ??  "^"+(await PackageJSON.resolveLatest(name));
  }
  async devDependency(name: string, version?: string) {
    await this.dependency(name, version, this.DEV_DEPS);
  }
  async peerDependency(name: string, version?: string) {
    await this.dependency(name, version, this.PEER_DEPS);
  }
  async optionalDependency(name: string, version?: string) {
    await this.dependency(name, version, this.OPTIONAL_DEPS);
  }
  readonly DEPS: Record<string, string> = {};
  readonly SCRIPTS: Record<string, string> = {};
  script(name: string, command: string) {
    this.SCRIPTS[name] = command;
  }
  readonly BIN: Record<string, string> = {};
  bin(name: string, path: string) {
    this.BIN[name] = path;
  }
  readonly EXPORTS: Record<string, { default: string; types?: string }> = {};
  addExport(name: string, file: string, types?: string) {
    this.EXPORTS[name] = { default: file, ...(types ? { types } : {}) };
  }
  // readonly ENGINES :Record<string,string>={};
  readonly PEER_DEPS: Record<string, string> = {};
  readonly OPTIONAL_DEPS: Record<string, string> = {};
  async generateCode(fs: FS.Writer) {
    fs.write("package.json", JSON.stringify(
      {
        name: this.name,
        version: this.version,
        packageManager:
          this.pm + "@" + (await PackageJSON.resolveLatest(this.pm)),
        private: this.prvate,
        publishConfig: {
          access: this.prvate ? "private" : "public",
        },
        dependencies: this.DEPS,
        devDependencies: this.DEV_DEPS,
        optionalDependencies: this.OPTIONAL_DEPS,
        peerDependencies: this.PEER_DEPS,
        bin: this.BIN,
        scripts: this.SCRIPTS,
        exports: this.EXPORTS,
        ...(this.type ? { type: this.type } : {}),
        ...(this.description ? { description: this.description } : {}),
      },
      undefined,
      1,
    ));
  }
}
export namespace PackageJSON {
  export async function resolveLatest(pkg: string) {
    const res = await Net.fetchT(`https://registry.npmjs.org/${pkg}/latest`);
    if (res.resultOk) {
      const { version } = await res.result.json();
      return version as string;
    } else {
      return "latest";
    }
  }
}
