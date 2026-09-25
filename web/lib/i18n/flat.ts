/**
 * A dictionary as a flat list of strings, keyed by their path ("home.steps[1].title"), and back. That is
 * the shape a translation service works with, and what the translations table stores.
 */
export type Flat = Record<string, string>;

export function flatten(value: unknown, prefix = "", out: Flat = {}): Flat {
  if (typeof value === "string") out[prefix] = value;
  else if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

/** The same shape as `shape`, with every string replaced by its translation when there is one. */
export function unflatten<T>(shape: T, strings: Flat, prefix = ""): T {
  if (typeof shape === "string") return (strings[prefix] ?? shape) as T;
  if (Array.isArray(shape)) return shape.map((v, i) => unflatten(v, strings, `${prefix}[${i}]`)) as T;
  if (shape && typeof shape === "object") return Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, unflatten(v, strings, prefix ? `${prefix}.${k}` : k)])) as T;
  return shape;
}
