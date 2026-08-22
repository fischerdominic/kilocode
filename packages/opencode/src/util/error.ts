export function errorData(error: unknown): { message: string; stack?: string } {
  return { message: String(error) }
}

export function errorMessage(error: unknown): string {
  return String(error)
}
