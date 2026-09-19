export namespace Net {
  export async function ok(url: string) {
    try {
      return !(await fetch(url)).ok
        ? (() => {
            throw "";
          })()
        : true;
    } catch (e) {
      return false;
    }
  }
  export async function fetchT(
    url: string,
  ): Promise<{ ok: true; resultOk: boolean; result: Response } | { ok: false; resultOk: false; result: undefined }> {
    try {
      const res = await fetch(url);
      return { ok: true, result: res, resultOk: res.ok };
    } catch (e) {
      return { ok: false, result: undefined, resultOk: false};
    }
  }
}
