import { Injectable, inject } from "@angular/core"
import { Api } from "./api"

export interface Profile {
  readonly customerId: string
  readonly email: string
  readonly firstname: string
  readonly lastname: string
  readonly phoneNumber: string
  readonly language?: string
  readonly line1?: string
  readonly line2?: string
  readonly line3?: string
}

@Injectable({ providedIn: "root" })
export class ProfileService {
  readonly #api = inject(Api)

  get(): Promise<{ profile: Profile | null }> {
    return this.#api.get<{ profile: Profile | null }>("/customers/profile")
  }

  save(profile: Omit<Profile, "customerId">): Promise<Profile> {
    return this.#api.post<Profile>("/customers/profile", profile)
  }
}
