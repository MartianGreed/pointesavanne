import { Settings } from "@structure-ai/config"
import { observabilitySettings } from "@structure-ai/observability"

type SettingValue<S> = S extends Settings.Setting<infer A> ? A : never

/**
 * Application settings. The declaration is the documentation source:
 * `Settings.renderDocs(appSettings)` renders the reference table used in the
 * README. Secrets stay Redacted all the way to their point of use.
 */
export const appSettings = Settings.struct({
  http: Settings.nested("HTTP", Settings.struct({ port: Settings.port("PORT", { default: 3000 }) })),
  databaseUrl: Settings.secret("DATABASE_URL", {
    description: "PostgreSQL connection URL (event store, views, auth store)",
  }),
  baseUrl: Settings.url("BASE_URL", {
    default: new URL("http://localhost:3000"),
    description: "public base URL of the API (auth links, tenant origins)",
  }),
  adminMail: Settings.string("ADMIN_MAIL", { description: "mailbox receiving internal notifications" }),
  ownerEmails: Settings.string("OWNER_EMAILS", {
    default: "",
    description: "comma-separated emails granted the owner role at sign-in",
  }),
  filesDir: Settings.string("FILES_DIR", {
    default: "./var/files",
    description: "base directory for generated quotations and uploaded documents",
  }),
  obs: observabilitySettings,
})

export type AppConfig = SettingValue<typeof appSettings>

export const ownerEmailList = (config: AppConfig): ReadonlyArray<string> =>
  config.ownerEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
