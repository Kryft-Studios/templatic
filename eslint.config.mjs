import { CONFIG } from "@kryft/naming-convention";
import { readdirSync } from "node:fs";

Object.assign(CONFIG, {
    files: readdirSync("./packages", {
        withFileTypes: true
    })
        .filter(entry => entry.isDirectory())
        .map(entry => `packages/${entry.name}/src/**/*.ts`)
});

export default CONFIG;
