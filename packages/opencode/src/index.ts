import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { ServeCommand } from "./cli/cmd/serve"
import { GenerateCommand } from "./cli/cmd/generate"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { ensureProcessMetadata } from "@opencode-ai/core/util/opencode-process" // kilocode_change
import { KiloCli } from "@/kilocode/cli/setup" // kilocode_change
import * as Log from "@opencode-ai/core/util/log" // kilocode_change

const args = hideBin(process.argv)
const metadata = ensureProcessMetadata("main") // kilocode_change - correlate logs across the CLI and TUI worker

if (await KiloCli.runner()) process.exit() // kilocode_change - run persistent process guardians before CLI bootstrap

function show(out: string) {
  process.stderr.write(out)
}

let cli = yargs(args) // kilocode_change
  .parserConfiguration({ "populate--": true })
  .scriptName("kilo") // kilocode_change
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
  .middleware(async (opts) => {
    if (opts.printLogs) process.env.KILO_PRINT_LOGS = "1"
    if (opts.logLevel) process.env.KILO_LOG_LEVEL = opts.logLevel
    if (opts.pure) {
      process.env.KILO_PURE = "1"
    }

    process.env.AGENT = "1"
    process.env.OPENCODE = "1"
    process.env.KILO_PID = String(process.pid)
    await KiloCli.bootstrap(opts) // kilocode_change - env tagging, telemetry init, legacy JSON-to-SQLite migration, and auth migration
    // kilocode_change start - retain Kilo process/run correlation metadata in startup logs
    Log.Default.info("opencode", {
      version: InstallationVersion,
      command: args[0] ?? "", // avoid persisting prompts, passwords, tokens, headers, or environment values
      process_role: metadata.processRole,
      run_id: metadata.runID,
    })
    // kilocode_change end
  })
  .usage("")
  .completion("completion", "generate shell completion script")
  .command(ServeCommand)
  .command(GenerateCommand)

// kilocode_change start - register Kilo-specific commands after the upstream chain
cli = KiloCli.register(cli)
cli = cli
  // kilocode_change end
  .fail((msg, err) => {
    if (
      msg?.startsWith("Unknown argument") ||
      msg?.startsWith("Not enough non-option arguments") ||
      msg?.startsWith("Invalid values:")
    ) {
      if (err) throw err
      cli.showHelp(show)
    }
    if (err) throw err
    process.exit(1)
  })
  .strict()

try {
  if (args.includes("-h") || args.includes("--help")) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
} catch (e) {
  process.stderr.write(String(e) + "\n")
  process.exitCode = 1
} finally {
  await KiloCli.shutdown() // kilocode_change - telemetry/session-export shutdown + instance disposal

  // Some subprocesses don't react properly to SIGTERM and similar signals.
  // Most notably, some docker-container-based MCP servers don't handle such signals unless
  // run using `docker run --init`.
  // Explicitly exit to avoid any hanging subprocesses.
  process.exit()
}
