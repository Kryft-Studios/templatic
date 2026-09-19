import { mkdirSync, readdirSync, rmdirSync, rmSync, statSync } from "node:fs";
import pathf, { dirname, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export namespace PathHelpers {
 export function dir(path: string) {
   const target = resolve(path);

   try {
     return statSync(target).isDirectory() ? target : dirname(target);
   } catch (error) {
     if ((error as NodeJS.ErrnoException).code === "ENOENT") {
       return target;
     }

     throw error;
   }
 }
export function clearDir(path: string) {
  const target = resolve(path);

  for (const file of readdirSync(target)) {
    rmSync(pathf.join(target, file), {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  }
}
}
