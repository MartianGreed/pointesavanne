import { Injectable, computed, inject, signal } from "@angular/core"
import { Api } from "./api"

export interface SessionUser {
  readonly id: string
  readonly email?: string
  readonly emailVerified: boolean
}

/**
 * Authentication state over the API's cookie sessions (HttpOnly — the client
 * never touches the token). Registration is a two-step flow: auth register,
 * then the profile is saved once the session exists.
 */
@Injectable({ providedIn: "root" })
export class Auth {
  readonly #api = inject(Api)
  readonly #user = signal<SessionUser | null | undefined>(undefined)

  readonly user = computed(() => this.#user())
  readonly signedIn = computed(() => this.#user() != null)

  async refresh(): Promise<void> {
    try {
      const body = await this.#api.get<{ session: { user: SessionUser } | null }>("/auth/session")
      this.#user.set(body.session?.user ?? null)
    } catch {
      this.#user.set(null)
    }
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
    await this.#api.post("/auth/sign-out", {})
    this.#user.set(null)
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
}
