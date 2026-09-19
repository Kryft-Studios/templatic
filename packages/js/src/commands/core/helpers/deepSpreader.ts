  function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  export function deepSpread(
    a: Record<string, any>,
    b: Record<string, any>,
  ): Record<string, any> {
    for (const [key, value] of Object.entries(b)) {
      if (isObject(a[key]) && isObject(value)) {
        deepSpread(a[key], value);
      } else if (Array.isArray(a[key])) {
        a[key] = [...a[key], ...(Array.isArray(value) ? value : [value])];
      } else {
        a[key] = value;
      }
    }

    return a;
  }