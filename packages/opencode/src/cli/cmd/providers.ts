import type { Argv } from "yargs"
import { Auth } from "../../auth"
import { cmd } from "./cmd"
import { CliError, effectCmd, fail } from "../effect-cmd"
import { UI } from "../ui"
import * as Prompt from "../effect/prompt"
import { errorMessage } from "@/util/error"
import { Effect, Option } from "effect"
// kilocode_change - removed: ModelsDev, Plugin, Hooks, Config, Global, Process, map, pipe, sortBy, values, path, os, text, resolvePluginProviders

const promptValue = <Value>(value: Option.Option<Value>) => {
  if (Option.isNone(value)) return Effect.die(new UI.CancelledError())
  return Effect.succeed(value.value)
}

const put = Effect.fn("Cli.providers.put")(function* (key: string, info: Auth.Info) {
  const auth = yield* Auth.Service
  yield* Effect.orDie(auth.set(key, info))
})

const cliTry = <Value>(message: string, fn: () => PromiseLike<Value>) =>
  Effect.tryPromise({
    try: fn,
    catch: (error) => new CliError({ message: message + errorMessage(error) }),
  })

// kilocode_change start - simplified login with only custom provider API key auth
export const ProvidersCommand = cmd({
  command: "auth",
  aliases: ["providers"],
  describe: "manage AI providers and credentials",
  builder: (yargs) =>
    yargs.command(ProvidersListCommand).command(ProvidersLoginCommand).command(ProvidersLogoutCommand).demandCommand(),
  async handler() {},
})

export const ProvidersListCommand = effectCmd({
  command: "list",
  aliases: ["ls"],
  describe: "list providers and credentials",
  instance: false,
  handler: Effect.fn("Cli.providers.list")(function* (_args) {
    const authSvc = yield* Auth.Service

    UI.empty()
    const authPath = `${globalThis.process?.env?.HOME ?? "~"}/.local/share/kilo/storage/auth.json`
    const displayPath = authPath.startsWith(globalThis.process?.env?.HOME ?? "") ? authPath.replace(globalThis.process?.env?.HOME ?? "", "~") : authPath
    yield* Prompt.intro(`Credentials ${UI.Style.TEXT_DIM}${displayPath}`)
    const results = Object.entries(yield* Effect.orDie(authSvc.all()))

    for (const [providerID, result] of results) {
      yield* Prompt.log.info(`${providerID} ${UI.Style.TEXT_DIM}${result.type}`)
    }

    yield* Prompt.outro(`${results.length} credentials`)
  }),
})

export const ProvidersLoginCommand = effectCmd({
  command: "login [provider]",
  describe: "add an API key for a custom provider",
  instance: false,
  builder: (yargs: Argv) =>
    yargs.positional("provider", {
      describe: "provider id to add credentials for",
      type: "string",
    }),
  handler: Effect.fn("Cli.providers.login")(function* (args) {
    const authSvc = yield* Auth.Service

    UI.empty()
    yield* Prompt.intro("Add credential")

    const provider = args.provider ?? (yield* promptValue(
      yield* Prompt.text({
        message: "Enter provider id",
        validate: (x) => (x && x.match(/^[0-9a-z-]+$/) ? undefined : "a-z, 0-9 and hyphens only"),
      }),
    )).replace(/^@ai-sdk\//, "")

    const key = yield* Prompt.password({
      message: "Enter your API key",
      validate: (x) => (x && x.length > 0 ? undefined : "Required"),
    })
    const apiKey = yield* promptValue(key)
    yield* Effect.orDie(authSvc.set(provider, { type: "api", key: apiKey }))

    yield* Prompt.outro("Done")
  }),
})

export const ProvidersLogoutCommand = effectCmd({
  command: "logout [provider]",
  describe: "log out from a configured provider",
  builder: (yargs) =>
    yargs.positional("provider", {
      describe: "provider id or name to log out from",
      type: "string",
    }),
  instance: false,
  handler: Effect.fn("Cli.providers.logout")(function* (args) {
    const authSvc = yield* Auth.Service

    UI.empty()
    const credentials: Array<[string, Auth.Info]> = Object.entries(yield* Effect.orDie(authSvc.all()))
    yield* Prompt.intro("Remove credential")
    if (credentials.length === 0) {
      yield* Prompt.log.error("No credentials found")
      return
    }
    const options = credentials.map(([key, value]) => ({
      label: key + UI.Style.TEXT_DIM + " (" + value.type + ")",
      value: key,
    }))
    const provider = args.provider
      ? options.find((option) => option.value === args.provider)?.value
      : yield* promptValue(
          yield* Prompt.autocomplete({
            message: "Select provider",
            maxItems: 8,
            options,
          }),
        )
    if (!provider) return yield* fail(`Unknown configured provider "${args.provider}"`)
    // kilocode_change start - lazy import keeps the CLI startup graph light
    const { remove: removeAuth } = yield* Effect.promise(() => import("@/kilocode/auth/remove"))
    yield* removeAuth(provider)
    // kilocode_change end
    yield* Prompt.outro("Logout successful")
  }),
})
// kilocode_change end
