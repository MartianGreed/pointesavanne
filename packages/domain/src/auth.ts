import type { AuthEmail, AuthService, TenantAuthConfig } from "@structure-ai/auth"
import { Principal } from "@structure-ai/authorization"
import { Context, Effect, Option } from "effect"
import { Mailer } from "./infra.ts"
import { TENANT_ID } from "./policy.ts"
import { DomainConfigTag, ownerEmailList } from "./settings.ts"

/**
 * Authentication composition helpers. @structure-ai/auth owns the credential
 * lifecycle (register, verify, sign in/out, password reset/change, sessions);
 * this module composes it with the domain's ports and config:
 *
 * - email delivery: the domain Mailer port
 * - sessions: opaque bearer tokens in an HttpOnly cookie, resolved to an
 *   authorization Principal at the host's HTTP edge
 * - storage: chosen by the host application (auth-pg in the API process,
 *   in-memory in tests)
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

/**
 * Session cookie → authorization principal. Unverifiable or absent sessions
 * resolve to anonymous so guards answer 401 (never a 500), per the
 * authorization middleware contract; infrastructure failures die.
 */
export const resolvePrincipal = (
  cookieHeader: string | null,
): Effect.Effect<Option.Option<Principal>, never, AppAuthTag | DomainConfigTag> =>
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

    const config = yield* DomainConfigTag
    const email = session.user.email ?? ""
    const roles = ownerEmailList(config).includes(email.toLowerCase()) ? ["customer", "owner"] : ["customer"]
    return Option.some({
      id: session.user.id,
      roles,
      kind: "user" as const,
      attributes: { email },
    })
  })
