import { BadRequestError } from "./errors";

export function requireFields<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[]
): void {
  for (const field of fields) {
    if (!body[field]) {
      throw new BadRequestError(`Field '${String(field)}' is required`);
    }
  }
}
