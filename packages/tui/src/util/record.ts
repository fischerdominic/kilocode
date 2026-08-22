// Stub TUI package - all exports are no-ops

export function isRecord(_value: unknown): boolean { return false }
export function isString(_value: unknown): _value is string { return typeof _value === "string" }
export function isNumber(_value: unknown): _value is number { return typeof _value === "number" }
export function isBoolean(_value: unknown): _value is boolean { return typeof _value === "boolean" }
export function isNull(_value: unknown): _value is null { return _value === null }
export function isUndefined(_value: unknown): _value is undefined { return _value === undefined }
