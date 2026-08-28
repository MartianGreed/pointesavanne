import { Settings, toLayer } from "@structure-ai/config"
import { observabilitySettings } from "@structure-ai/observability"
import { adminMailSetting, baseUrlSetting, ownerEmailsSetting } from "@pointesavanne/domain"
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

export const ApiConfigLive = Layer.unwrapEffect(
  Effect.promise(async () =>
    toLayer(ApiConfigTag, apiSettings, {
      // The dotenv file is optional: containers may pass environment only.
      ...(await Bun.file(".env").exists() ? { dotEnvFile: ".env" } : {}),
    }),
  ),
)
