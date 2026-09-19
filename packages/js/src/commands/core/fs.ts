import { existsSync, mkdirSync, writeFileSync } from "node:fs";

export namespace FS {
  export class Writer {
    constructor(public force: boolean) {}
    write(path: string, data: string | Buffer) {
      if (this.force && existsSync(path)) return;
      writeFileSync(path, data);
    }
    mkdir(path: string){
        if(this.force && existsSync(path))return;
        mkdirSync(path);
    }
  }
}
