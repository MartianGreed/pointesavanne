import { allowAllRateLimiter, makeAuth, makeAuthHandler } from "@structure-ai/auth"
import { makeAuthStore, migrate as migrateAuthPg } from "@structure-ai/auth-pg"
import { Effect, Layer, Redacted } from "effect"
import { SQL } from "bun"
import { AppAuthTag, mailerEmailSender, tenantConfigOf, TENANT_ID, type AppAuth } from "@pointesavanne/domain"
import { Mailer } from "@pointesavanne/domain"
import { ApiConfigTag, type ApiConfig } from "./settings.ts"

/**
 * Durable auth wiring for the API process: @structure-ai/auth over auth-pg
 * (Bun SQL, PostgreSQL). Tests build their own with in-memory adapters.
 *
 * Single-instance deployment note: the rate limiter is in-memory and honest
 * for one process; move it to a shared store before scaling horizontally.
 */

/** Builds the auth service + Web handler over the durable auth-pg store. */
const buildAppAuth = (config: ApiConfig): Effect.Effect<AppAuth, never, Mailer> =>
  Effect.gen(function* () {
    const emailSender = yield* mailerEmailSender
    const tenantConfig = tenantConfigOf(config.baseUrl)

    const sql = new SQL({
      adapter: "postgres",
      url: Redacted.value(config.databaseUrl),
      max: 5,
    })
    yield* migrateAuthPg(sql).pipe(Effect.orDie)

    const auth = makeAuth({
      store: makeAuthStore(sql),
      resolveTenant: () => Effect.succeed(tenantConfig),
      emailSender,
      rateLimiter: allowAllRateLimiter,
    })

    const http = makeAuthHandler(auth, { resolveTenant: () => Effect.succeed(TENANT_ID) })
    return { auth, handler: http.handler, tenantConfig }
  })

export const AppAuthPg = Layer.effect(
  AppAuthTag,
  Effect.flatMap(ApiConfigTag, (config) => buildAppAuth(config)),
)
