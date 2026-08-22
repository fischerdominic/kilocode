export function hasTheme(themes: Record<string, unknown>, name: string): boolean {
  return name in themes
}

export function upsertTheme(themes: Record<string, unknown>, theme: unknown): Record<string, unknown> {
  return themes
}
