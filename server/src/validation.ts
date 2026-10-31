const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && EMAIL_PATTERN.test(value);

export const isName = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 60;

export const isPassword = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 8 && value.length <= 200;

export const isTitle = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= 120;

export const isOptionalLabel = (value: unknown): value is string | null =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.length <= 120);
