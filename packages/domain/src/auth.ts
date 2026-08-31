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

/**
 * SPA landing routes for one-time links. @structure-ai/auth hardcodes
 * /auth/* paths onto BASE_URL (the browser origin), but those are API paths:
 * the dev-server proxy forwards /auth/* to the API, which only serves POST.
 * Rewriting to the client's routes makes the e-mail link open the page that
 * consumes the token; kinds without a landing page keep the library's URL.
 */
const spaLinkPaths: Partial<Record<AuthEmail["kind"], string>> = {
  "email-verification": "/verification",
  "password-reset": "/mot-de-passe/reinitialiser",
}

const landingLinkOf = (email: AuthEmail): string => {
  const path = spaLinkPaths[email.kind]
  if (path === undefined) return email.url
  const url = new URL(email.url)
  url.pathname = path
  return url.toString()
}

export const mailerEmailSender = Effect.map(Mailer, (mailer) => ({
  send: (email: AuthEmail) =>
    mailer.send({
      to: email.to,
      subject: mailSubject(email.kind),
      body: ["Bonjour,", "", `Ce lien expire le ${email.expiresAt.toISOString()}:`, landingLinkOf(email)].join("\n"),
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
