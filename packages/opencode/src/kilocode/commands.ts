// All CommandModules in one place so help.ts and generate-cli-docs.ts can
// introspect them without importing index.ts (which has startup side effects).
import { ServeCommand } from "../cli/cmd/serve"
import { GenerateCommand } from "../cli/cmd/generate"
import { HelpCommand } from "./help-command"
import { InstallationBuildKind } from "@opencode-ai/core/installation/version"

// Synthetic entry for the yargs built-in .completion() command so that
// generateHelp --all and cli-reference.md include it automatically.
const CompletionCommand = {
  command: "completion",
  describe: "generate shell completion script",
  handler: () => {},
}

// kilocode_change start - serve and generate commands remain after CLI removal
export const commands = [ServeCommand, GenerateCommand, HelpCommand, CompletionCommand]
// kilocode_change end
