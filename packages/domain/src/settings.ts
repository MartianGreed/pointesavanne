import { Settings } from "@structure-ai/config"
import { Context } from "effect"

type SettingValue<S> = S extends Settings.Setting<infer A> ? A : never

/**
 * Domain settings — the configuration the business logic itself needs (auth
 * links, notification recipients, ownership grants). Host applications
 * compose these declarations into their own settings struct, so the env var
 * names and docs are owned here and shared everywhere.
 */
export const baseUrlSetting = Settings.url("BASE_URL", {
  default: new URL("http://localhost:3000"),
  description: "public base URL of the API (auth links, tenant origins)",
})

export const adminMailSetting = Settings.string("ADMIN_MAIL", {
  description: "mailbox receiving internal notifications",
})

export const ownerEmailsSetting = Settings.string("OWNER_EMAILS", {
  default: "",
  description: "comma-separated emails granted the owner role at sign-in",
})

export const domainSettings = Settings.struct({
  baseUrl: baseUrlSetting,
  adminMail: adminMailSetting,
  ownerEmails: ownerEmailsSetting,
})

export type DomainConfig = SettingValue<typeof domainSettings>

/** Typed domain config available to projections, handlers and auth wiring. */
export class DomainConfigTag extends Context.Tag("pointesavanne/DomainConfig")<DomainConfigTag, DomainConfig>() {}

export const ownerEmailList = (config: DomainConfig): ReadonlyArray<string> =>
  config.ownerEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)

/** Projects a host application's config down to the domain slice. */
export const domainConfigOf = <C extends DomainConfig>(config: C): DomainConfig => ({
  baseUrl: config.baseUrl,
  adminMail: config.adminMail,
  ownerEmails: config.ownerEmails,
})
