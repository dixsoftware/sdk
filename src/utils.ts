const CAMEL_TO_SNAKE = /[A-Z]/g;
const SNAKE_TO_CAMEL = /_([a-z])/g;

export function toSnakeCase(value: string): string {
  return value.replace(CAMEL_TO_SNAKE, (letter) => `_${letter.toLowerCase()}`);
}

export function toCamelCase(value: string): string {
  return value.replace(SNAKE_TO_CAMEL, (_, letter: string) => letter.toUpperCase());
}

export function transformKeys(
  value: unknown,
  transformer: (key: string) => string,
  preserveNestedKeys = new Set(["metadata"])
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => transformKeys(item, transformer, preserveNestedKeys));
  }

  if (!value || typeof value !== "object" || value instanceof Date || value instanceof Uint8Array) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      transformer(key),
      preserveNestedKeys.has(key) ? item : transformKeys(item, transformer, preserveNestedKeys)
    ])
  );
}

export function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    search.set(toSnakeCase(key), String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}
