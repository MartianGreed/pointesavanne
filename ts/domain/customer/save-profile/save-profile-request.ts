import type { Email } from '../email.ts'

export class SaveProfileRequest {
  constructor(
    public readonly email: Email,
    public readonly firstname: string | null = null,
    public readonly lastname: string | null = null,
    public readonly phoneNumber: string | null = null,
    public readonly language: string | null = null,
    public readonly line1: string | null = null,
    public readonly line2: string | null = null,
    public readonly line3: string | null = null
  ) {}
}
