export function errorData(_error: unknown): { message: string; stack?: string } {
  return { message: String(_error) }
}

export function errorMessage(_error: unknown): string {
  return String(_error)
}
