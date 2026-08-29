import { Settings, toLayer } from "@structure-ai/config"
import { observabilitySettings } from "@structure-ai/observability"
import { adminMailSetting, baseUrlSetting, ownerEmailsSetting } from "@pointesavanne/domain"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { Context, Effect, Layer } from "effect"

type SettingValue<S> = S extends Settings.Setting<infer A> ? A : never

/**
 * API runtime settings — the domain's declarations (BASE_URL, ADMIN_MAIL,
 * OWNER_EMAILS) composed with the process-level settings this host owns.
 * The declaration is the documentation source: `Settings.renderDocs`
 * renders the reference table used in the README.
 */
export const apiSettings = Settings.struct({
  http: Settings.nested("HTTP", Settings.struct({ port: Settings.port("PORT", { default: 3000 }) })),
  databaseUrl: Settings.secret("DATABASE_URL", {
    description: "PostgreSQL connection URL (event store, views, auth store)",
  }),
  baseUrl: baseUrlSetting,
  adminMail: adminMailSetting,
  ownerEmails: ownerEmailsSetting,
  filesDir: Settings.string("FILES_DIR", {
    default: "./var/files",
    description: "base directory for generated quotations and uploaded documents",
  }),
  obs: observabilitySettings,
})

export type ApiConfig = SettingValue<typeof apiSettings>

/** The full config of this API process (superset of the domain slice). */
export class ApiConfigTag extends Context.Tag("pointesavanne/ApiConfig")<ApiConfigTag, ApiConfig>() {}

/**
 * The dotenv file for local development, when present. `bun run dev` runs
 * every task in its package directory, so a cwd-relative `.env` would miss
 * the one at the monorepo root (the documented `cp .env.dist .env` spot) —
 * resolve the workspace root (marked by the bun lockfile) as a fallback.
 * Dotenv only fills gaps: real environment variables always win.
 */
const dotEnvFile = (): string | undefined => {
  if (existsSync(".env")) return ".env"
  for (let dir = dirname(import.meta.path); dir !== dirname(dir); dir = dirname(dir)) {
    if (!existsSync(join(dir, "bun.lock"))) continue
    return existsSync(join(dir, ".env")) ? join(dir, ".env") : undefined
  }
  return undefined
}

export const ApiConfigLive = Layer.unwrapEffect(
  Effect.promise(async () => {
    const dotEnv = dotEnvFile()
    return toLayer(ApiConfigTag, apiSettings, {
      // The dotenv file is optional: containers may pass environment only.
      ...(dotEnv !== undefined ? { dotEnvFile: dotEnv } : {}),
    })
  }),
)
