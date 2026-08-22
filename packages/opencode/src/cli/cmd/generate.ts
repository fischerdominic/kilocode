import { Effect } from "effect"
import { cmd } from "./cmd"
import { OpenApi } from "effect/unstable/httpapi"
import { OpenCodeHttpApi } from "../../server/routes/instance/httpapi/api"
import { PublicApi } from "../../server/routes/instance/httpapi/public"

// kilocode_change - regenerate OpenAPI spec for SDK generation
export const GenerateCommand = cmd({
  command: "generate",
  describe: "generate OpenAPI spec to stdout",
  handler: async () => {
    const spec = OpenApi.fromApi(OpenCodeHttpApi)
    process.stdout.write(JSON.stringify(spec, null, 2))
  },
})
