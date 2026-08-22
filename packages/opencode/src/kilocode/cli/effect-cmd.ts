import { Effect, Schema } from "effect"

/**
 * User-visible command failure. Throw via `fail("...")` from a handler
 * to surface a printed message + non-zero exit.
 */
export class CliError extends Schema.TaggedErrorClass<CliError>()("CliError", {
  message: Schema.String,
  exitCode: Schema.optional(Schema.Number),
}) {}

export const fail = (message: string, exitCode = 1) => Effect.fail(new CliError({ message, exitCode }))
