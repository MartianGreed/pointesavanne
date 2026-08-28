import {
  allowAllRateLimiter,
  makeAuth,
  makeAuthHandler,
  type AuthEmail,
  type TenantAuthConfig,
} from "@structure-ai/auth"
import { makeAuthStore, migrate as migrateAuthPg } from "@structure-ai/auth-pg"
import type { AuthService } from "@structure-ai/auth"
import { Principal } from "@structure-ai/authorization"
import { SQL } from "bun"
import { Context, Effect, Layer, Option, Redacted } from "effect"
import { Mailer } from "./infra.ts"
import { TENANT_ID } from "./policy.ts"
import type { AppConfig } from "./settings.ts"
import { ownerEmailList } from "./settings.ts"
import { AppConfigTag } from "./views.ts"

/**
 * Authentication wiring. @structure-ai/auth owns the credential lifecycle
 * (register, verify, sign in/out, password reset/change, sessions); this
 * module composes it with the application's ports:
 *
 * - storage: auth-pg (Bun SQL, PostgreSQL) in production, in-memory in tests
 * - email delivery: the application Mailer port
 * - sessions: opaque bearer tokens in an HttpOnly cookie, resolved to an
 *   authorization Principal at the HTTP edge
 *
 * Single-instance deployment note: the rate limiter is in-memory and honest
 * for one process; move it to a shared store before scaling horizontally.
 */

export type AuthRequestHandler = (request: Request) => Promise<Response>

export interface AppAuth {
  readonly auth: AuthService
  readonly handler: AuthRequestHandler
  readonly tenantConfig: TenantAuthConfig
}

export class AppAuthTag extends Context.Tag("pointesavanne/AppAuth")<AppAuthTag, AppAuth>() {}

export const tenantConfigOf = (baseUrl: URL): TenantAuthConfig => ({
  baseUrl,
  session: { cookieName: "pointesavanne_session", ttlMillis: 14 * 24 * 3600_000 },
  tokens: {
    emailVerificationTtlMillis: 24 * 3600_000,
    magicLinkTtlMillis: 3600_000,
    passwordResetTtlMillis: 3600_000,
  },
  password: { minLength: 8 },
  passkey: {
    rpId: baseUrl.hostname,
    rpName: "Villa Pointe Savanne",
    origins: [baseUrl.origin],
  },
})

const mailSubject = (kind: AuthEmail["kind"]): string =>
  kind === "email-verification"
    ? "Vérifiez votre adresse e-mail — Villa Pointe Savanne"
    : kind === "password-reset"
      ? "Réinitialisation de votre mot de passe — Villa Pointe Savanne"
      : "Votre lien de connexion — Villa Pointe Savanne"

export const mailerEmailSender = Effect.map(Mailer, (mailer) => ({
  send: (email: AuthEmail) =>
    mailer.send({
      to: email.to,
      subject: mailSubject(email.kind),
      body: ["Bonjour,", "", `Ce lien expire le ${email.expiresAt.toISOString()}:`, email.url].join("\n"),
    }),
}))

/** Builds the auth service + Web handler over the durable auth-pg store. */
const buildAppAuth = (config: AppConfig): Effect.Effect<AppAuth, never, Mailer> =>
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

/** Production auth (auth-pg). Tests build their own with in-memory adapters. */
export const AppAuthPg = Layer.effect(AppAuthTag, Effect.flatMap(AppConfigTag, (config) => buildAppAuth(config)))

/**
 * Session cookie → authorization principal. Unverifiable or absent sessions
 * resolve to anonymous so guards answer 401 (never a 500), per the
 * authorization middleware contract; infrastructure failures die.
 */
export const resolvePrincipal = (
  cookieHeader: string | null,
): Effect.Effect<Option.Option<Principal>, never, AppAuthTag | AppConfigTag> =>
  Effect.gen(function* () {
    const { auth } = yield* AppAuthTag
    const token = yield* auth.sessionTokenFromCookie(TENANT_ID, cookieHeader).pipe(
      Effect.catchTags({
        InvalidAuthToken: () => Effect.succeed(undefined),
        InvalidCredentials: () => Effect.succeed(undefined),
      }),
      Effect.orDie,
    )
    if (token === undefined) return Option.none()

    const session = yield* auth.getSession(TENANT_ID, token).pipe(
      Effect.catchTags({
        InvalidAuthToken: () => Effect.succeed(null),
        InvalidCredentials: () => Effect.succeed(null),
      }),
      Effect.orDie,
    )
    if (session === null) return Option.none()

    const config = yield* AppConfigTag
    const email = session.user.email ?? ""
    const roles = ownerEmailList(config).includes(email.toLowerCase()) ? ["customer", "owner"] : ["customer"]
    return Option.some({
      id: session.user.id,
      roles,
      kind: "user" as const,
      attributes: { email },
    })
  })

/** Runs an effect as the internal system principal (background jobs). */
export { asSystem } from "./policy.ts"
