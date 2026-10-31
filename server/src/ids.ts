const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const isValidId = (value: unknown): value is string =>
  typeof value === "string" && ID_PATTERN.test(value);
