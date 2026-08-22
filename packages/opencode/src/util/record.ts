export function isRecord(value: unknown): boolean {
  return typeof value === "object" && value !== null
}

export function isString(value: unknown): value is string {
  return typeof value === "string"
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number"
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

export function isNull(value: unknown): value is null {
  return value === null
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}
