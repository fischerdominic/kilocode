import { Provider } from "@/provider/provider"

import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"

export const providerHandlers = HttpApiBuilder.group(InstanceHttpApi, "provider", (handlers) =>
  Effect.gen(function* () {
    const provider = yield* Provider.Service

    const list = Effect.fn("ProviderHttpApi.list")(function* () {
      const connected = yield* provider.list()
      const withModels = Object.fromEntries(
        Object.entries(connected).filter(([, p]) => Object.keys(p.models).length > 0),
      )
      return {
        all: Object.values(connected).map(Provider.toPublicInfo),
        default: Provider.defaultModelIDs(withModels),
        connected: Object.keys(connected),
        failed: [],
      }
    })

    // kilocode_change start - OAuth authorize/callback handlers removed (no built-in providers)
    // kilocode_change end

    return handlers.handle("list", list)
  }),
)
