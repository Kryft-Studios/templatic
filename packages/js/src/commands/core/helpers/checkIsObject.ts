export function checkIsObject(a:any){
  try {
    JSON.parse(a as string);
    return true;
  } catch {
    return false;
  }
}
