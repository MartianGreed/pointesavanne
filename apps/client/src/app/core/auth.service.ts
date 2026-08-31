import { Injectable, computed, inject, signal } from "@angular/core"
import { Api } from "./api"
import { QuoteFunnelStore } from "./quote-funnel.store"
import {
  authenticatePasskey,
  createPasskey,
  type PasskeyAuthenticationOptions,
  type PasskeyAuthenticationResult,
  type PasskeyRegistrationOptions,
  type PasskeyRegistrationResult,
} from "./passkey"

export interface SessionUser {
  readonly id: string
  readonly email?: string
  readonly emailVerified: boolean
}

/** GET /me — the session's principal and its policy-derived permissions. */
export interface Me {
  readonly authenticated: boolean
  readonly email?: string
  readonly permissions: readonly string[]
}

/**
 * Authentication state over the API's cookie sessions (HttpOnly — the client
 * never touches the token). Registration stays a two-step flow (auth
 * register → e-mail verification), but nothing is lost in between: the
 * devis funnel's intent lives on the backend as a quotation lead, claimed
 * automatically at the first sign-in.
 */
@Injectable({ providedIn: "root" })
export class Auth {
  readonly #api = inject(Api)
  readonly #funnel = inject(QuoteFunnelStore)
  readonly #user = signal<SessionUser | null | undefined>(undefined)
  readonly #permissions = signal<readonly string[]>([])

  readonly user = computed(() => this.#user())
  readonly signedIn = computed(() => this.#user() != null)
  /** Policy-derived permissions of the current principal (GET /me). */
  readonly permissions = computed(() => this.#permissions())
  readonly isOwner = computed(() => this.#permissions().includes("booking:read-all"))

  async refresh(): Promise<void> {
    const [sessionResult, meResult] = await Promise.allSettled([
      this.#api.get<{ session: { user: SessionUser } | null }>("/auth/session"),
      this.#api.get<Me>("/me"),
    ])
    this.#user.set(sessionResult.status === "fulfilled" ? (sessionResult.value.session?.user ?? null) : null)
    this.#permissions.set(meResult.status === "fulfilled" ? meResult.value.permissions : [])
  }

  async register(input: { email: string; password: string; firstname: string; lastname: string; phoneNumber: string }): Promise<void> {
    await this.#api.post("/auth/register/password", { email: input.email, password: input.password })
    // The e-mail verification link lands on /verification; nothing else to do
    // here — the profile is completed after the first sign-in.
  }

  async verifyEmail(token: string): Promise<void> {
    await this.#api.post("/auth/verify-email", { token })
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.#api.post("/auth/sign-in/password", { email, password })
    await this.refresh()
  }

  async signOut(): Promise<void> {
    try {
      await this.#api.post("/auth/sign-out", {})
    } finally {
      this.#user.set(null)
      this.#permissions.set([])
      // D1: the session's funnel draft (PII included) dies with it.
      this.#funnel.reset()
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.#api.post("/auth/password/reset/request", { email })
  }

  async completePasswordReset(token: string, newPassword: string): Promise<void> {
    await this.#api.post("/auth/password/reset/complete", { token, newPassword })
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.#api.post("/auth/password/change", { currentPassword, newPassword })
  }

  // --- passkeys -------------------------------------------------------------

  /**
   * Enrolls a passkey for the signed-in user: fetches creation options,
   * runs the browser ceremony, and verifies the result with the API.
   * Requires an authenticated session (the cookie travels with the request).
   */
  async registerPasskey(): Promise<void> {
    const options = await this.#api.post<PasskeyRegistrationOptions>(
      "/auth/passkeys/register/options",
      {},
    )
    const result = await createPasskey(options)
    await this.#api.post("/auth/passkeys/register/verify", result satisfies PasskeyRegistrationResult)
  }

  /**
   * Signs in with a passkey. With an e-mail, the ceremony is restricted to
   * that account's credentials; without one, discoverable credentials let
   * the browser offer the right account. Refreshes the session on success.
   */
  async signInWithPasskey(email?: string): Promise<void> {
    const options = await this.#api.post<PasskeyAuthenticationOptions>(
      "/auth/passkeys/authenticate/options",
      email === undefined || email === "" ? {} : { email },
    )
    const result = await authenticatePasskey(options)
    await this.#api.post("/auth/passkeys/authenticate/verify", result satisfies PasskeyAuthenticationResult)
    await this.refresh()
  }
}
