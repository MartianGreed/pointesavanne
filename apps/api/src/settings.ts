import { ConfigLoadError, parseDotEnv, Settings, toLayer } from "@structure-ai/config"
import { observabilitySettings } from "@structure-ai/observability"
import { adminMailSetting, baseUrlSetting, ownerEmailsSetting } from "@pointesavanne/domain"
import { existsSync, readFileSync } from "node:fs"
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
 * The dotenv candidates in precedence order, most specific first: the
 * working directory's `.env.local`/`.env` pair, then the workspace root's
 * (marked by the bun lockfile, found walking up from `from`) — Bun's own
 * convention, `.env.local` shadowing `.env` key by key. Tests pass
 * explicit paths.
 */
export const dotEnvCandidates = (cwd: string, from: string): ReadonlyArray<string> => {
  const locations = [cwd]
  for (let dir = dirname(from); dir !== dirname(dir); dir = dirname(dir)) {
    if (!existsSync(join(dir, "bun.lock"))) continue
    if (dir !== cwd) locations.push(dir)
    break
  }
  return [...new Set(locations)].flatMap((dir) => [join(dir, ".env.local"), join(dir, ".env")])
}

/**
 * The merged dotenv values of the existing candidate files, keys of more
 * specific files winning, minus every key already set in `env` — so feeding
 * them as explicit overrides keeps "real environment always wins".
 */
export const dotenvOverrides = (
  paths: ReadonlyArray<string>,
  env: Record<string, string | undefined> = process.env,
): Effect.Effect<Record<string, string>, ConfigLoadError> =>
  Effect.gen(function* () {
    const merged = new Map<string, string>()
    for (const path of paths) {
      if (!existsSync(path)) continue
      const content = yield* Effect.try({
        try: () => readFileSync(path, "utf8"),
        catch: (cause) =>
          new ConfigLoadError({
            issues: [{ kind: "source", path, reason: `cannot read file: ${String(cause)}` }],
          }),
      })
      for (const [key, value] of parseDotEnv(content)) {
        // Candidates arrive most specific first; keep the first value seen
        // per key so a more specific file shadows a less specific one.
        if (!merged.has(key)) merged.set(key, value)
      }
    }
    return Object.fromEntries([...merged].filter(([key]) => env[key] === undefined))
  })

/**
 * Loads the API config with local dotenv files layered underneath the real
 * environment: `process.env` → `.env.local` → `.env`, per key, the working
 * directory before the workspace root. `@structure-ai/config` takes a single
 * dotenv path, so the host merges the candidates itself and injects them as
 * explicit overrides (env-filtered, see dotenvOverrides). All files are
 * optional: containers may pass environment only.
 */
export const ApiConfigLive = Layer.unwrapEffect(
  Effect.map(
    dotenvOverrides(dotEnvCandidates(process.cwd(), import.meta.path)),
    (overrides) => toLayer(ApiConfigTag, apiSettings, { overrides }),
  ),
)
