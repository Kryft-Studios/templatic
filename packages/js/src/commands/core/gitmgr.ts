/// <reference types="node" />
import { execSync } from "node:child_process";
import { FS } from "./fs.js";

export namespace Git {
  export function init(cfg: string[]) {
    try {
      execSync("git init");
    } catch (e) {
      throw "`git` is not available at the time.";
    }
    for (const cf of cfg) {
      const ags = cf.split("=");
      const param = ags[0];
      const args = ags.slice(1).join("\\=");
      execSync(`git config set ${param}${args.length != 0 ? "=" + args : ""}`);
    }
  }
  export function branchName(n: string) {
    execSync(`git branch -M ${n}`);
  }
  export function remotes(n: string[]) {
    for (let i = 0; i < n.length; i++) {
      execSync(`git remote add origin${i === 0 ? "" : i} ${n[i]}`);
    }
  }
  let gitIgnoreContents = "";
  export function addToGitIgnore(add: string[], name?: string) {
    gitIgnoreContents += `
${name ? `# ${name}` : ""}
${add.join("\n")}`;
  }
  export function commit(commit: string) {
    execSync("git add .");
    execSync(`git commit -m ${commit}`);
  }
    export function writeGitIgnore(fs: FS.Writer, gitignore: boolean) {
        if (gitignore) return;
    fs.write(".gitignore", gitIgnoreContents);
  }
}
