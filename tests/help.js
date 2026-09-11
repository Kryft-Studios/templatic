
 import chalk from "chalk"
 function _c(str) {
        return chalk.green("[--"+str[0]+"]");
      }
      console.log(`Help:
${chalk.yellow("single-package")}:
    <name>: The main name of the package
    ${_c`builder`} (Union<esbuild | terser | swc | tsc>) The builder for this package.
        [?] TSC cannot be chosen if --ts is disabled. doing so results in a error
        [?] --packageJSON must be provided
    ${_c`node`} (Boolean) Whether this package is a node-based package.
        [?] This value cannot be true if --dom is enabled.
    ${_c`dom`} (Boolean) Whether this package is a dom-based package.
        [?] This value cannot be true if --node is enabled
    ${_c`type`} (Union<commonjs|module>) Whether this package is a commonjs or a module package.
        [?] packageJSON must be provided
    ${_c`lint`} (Boolean) Whether this package should be linted or not.
        [?] --packageJSON must be provided
    ${_c`githubFeature`} (Union<docs-workflow | lint-workflow | issue-templates>[]) (CAN BE MULTIPLE) Github features enabled for this repository.
        [?] This value cannot be provided if no github repository is given in --remotes
    ${_c`gitlabFeature`} (Union<lint-workflow | issue-templates>[]) (CAN BE MULTIPLE) Gitlab features for this repository
        [?] This value cannot be provided if no gitlab remote was given in --remotes
    ${_c`git`} (Boolean) Git integration for this package.
    ${_c`remotes`} (string[]) (CAN BE MULTIPLE) Git remotes for this git repo.
        [?] This value cannot be provided if --git is disabled
    ${_c`src`} (string) The src folder for the package.
    ${_c`docs`} (boolean) Whether to setup typedoc
        [?] This value cannot be provided if --ts is disabled
        [?] --packageJSON must be provided
    ${_c`docsAddon`} (Union<mermaid, vitepress>[]) (CAN BE MULTIPLE) templatic-curated addons for the typedoc
        [?] This value cannot be provided if --docs is disabled
    ${_c`typedocPlugin`} (string[]) (CAN BE MULTIPLE) Plugins for typedoc.
        [?] This value cannot be provided if --docs is disabled
        [?] All the packages given must be valid npm packages.
    ${_c`ts`} Whether to have ts integration.
        [?] --packageJSON must be provided
    ${_c`tslib`} (string[]) (CAN BE MULTIPLE) ts "lib"-s to includes
        [?] --ts must be enabled
    ${_c`tsconfigCompilerOptionsExt`} (string) exts to ts config compilerOptions.
        [?] must be valid JSON
    ${_c`tsconfigExt`} (string) exts to the tsconfig
        [?] must be valid JSON
    ${_c`mds`} (Union<readme|contributing|changelog|code-of-conduct|security|governance|maintainers|license|support>[]) (CAN BE MULTIPLE) automatically generated mds
    ${_c`dist`} (string) The place where the code is generated
        [?] this does not work if ts is disabled
    ${_c`mainBranchName`} (string) The main branch name.
        [?] --git must be enabled
    ${_c`initialCommit`} (string) does a initial commit if provided to all the remotes
        [?] --git must be enabled
    ${_c`gitIgnoreGeneration`} (boolean) .gitignore generation
        [?] --git must be enabled
    ${_c`gitcfg`} (string=string) git configuration
        [?] --git must be enabled
    ${_c`ignoreWarningFor`} (Union<command name>) ignores warning for a certain option
    ${_c`packageJSON`} (boolean) whether package.json is generated
    ${_c`noPrompts`}
    `);
    