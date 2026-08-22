import { describe, test, expect } from "bun:test"
import path from "path"
import { generateHelp, generateCommandTable } from "../../src/kilocode/help"
import { ServeCommand } from "../../src/cli/cmd/serve"
import { HelpCommand } from "../../src/kilocode/help-command"

const commands = [ServeCommand, HelpCommand]

describe("kilo help --all (markdown)", () => {
  test("contains ## heading for serve command", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    expect(output).toContain("## kilo serve")
  })
})

describe("kilo help --all (text)", () => {
  test("does NOT contain Markdown ## headings or triple-backtick fences", async () => {
    const output = await generateHelp({ all: true, format: "text", commands })
    expect(output).not.toMatch(/^##\s/m)
    expect(output).not.toContain("```")
  })

  test("still contains serve command name", async () => {
    const output = await generateHelp({ all: true, format: "text", commands })
    expect(output).toContain("kilo serve")
  })
})

describe("edge cases", () => {
  test("output contains no ANSI escape sequences", async () => {
    const output = await generateHelp({ all: true, format: "md", commands })
    expect(/\x1b\[/.test(output)).toBe(false)
  })
})

describe("generateCommandTable", () => {
  test("returns a string containing a markdown table header", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("| Command | Description |")
  })

  test("contains row for serve command", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("serve")
  })

  test("contains no ANSI escape sequences", async () => {
    const output = await generateCommandTable({ commands })
    expect(/\x1b\[/.test(output)).toBe(false)
  })

  test("contains kilo help row", async () => {
    const output = await generateCommandTable({ commands })
    expect(output).toContain("`kilo help")
  })
})

describe("Kilo CLI customizations are wired into index.ts", () => {
  const file = (rel: string) => Bun.file(path.resolve(import.meta.dir, rel)).text()
  const INDEX = "../../src/index.ts"
  const SETUP = "../../src/kilocode/cli/setup.ts"
  const BARREL = "../../src/kilocode/commands.ts"

  test("CLI is branded `kilo`, not `opencode`", async () => {
    const index = await file(INDEX)
    expect(index).toContain('.scriptName("kilo")')
    expect(index).not.toContain('.scriptName("opencode")')
  })

  test("index.ts invokes the KiloCli integration points", async () => {
    const index = await file(INDEX)
    expect(index).toContain("KiloCli.register(")
    expect(index).toContain("KiloCli.bootstrap(")
    expect(index).toContain("KiloCli.shutdown(")
  })

  test("every .command() in index.ts has an entry in the commands array", async () => {
    const index = await file(INDEX)
    const barrel = await file(BARREL)

    const registered = [...index.matchAll(/^\s*\.command\((\w+)\)/gm)].map((m) => m[1]!)
    expect(registered.length).toBeGreaterThan(0)

    const arrayMatch = barrel.match(/export const commands\s*=\s*\[([\s\S]*?)\]/)
    expect(arrayMatch).toBeTruthy()
    const entries = [...arrayMatch![1]!.matchAll(/\b(\w+Command)\b/g)].map((m) => m[1]!)

    const missing = registered.filter((name) => !entries.includes(name))
    expect(missing).toEqual([])
  })

  test("every barrel command is registered in index.ts or setup.ts", async () => {
    const index = await file(INDEX)
    const setup = await file(SETUP)
    const barrel = await file(BARREL)

    const registered = new Set(
      [...index.matchAll(/\.command\((\w+)\)/g), ...setup.matchAll(/\.command\((\w+)\)/g)].map((m) => m[1]!),
    )

    const arrayMatch = barrel.match(/export const commands\s*=\s*\[([\s\S]*?)\]/)
    expect(arrayMatch).toBeTruthy()
    const body = arrayMatch![1]!.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
    const entries = [...body.matchAll(/\b(\w+Command)\b/g)].map((m) => m[1]!)

    const except = new Set(["CompletionCommand", "HelpCommand"])
    const missing = entries.filter((name) => !except.has(name) && !registered.has(name))
    expect(missing).toEqual([])
  })
})
