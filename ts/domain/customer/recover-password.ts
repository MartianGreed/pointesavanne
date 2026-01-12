import { UuidGenerator } from '../shared/uuid-generator.ts'

export class RecoverPassword {
  private constructor(
    private readonly token: string,
    private readonly requestedAt: Date,
    private readonly expireAt: Date
  ) {}

  static recordNow(token: string | null = null): RecoverPassword {
    const now = new Date()
    const expireAt = new Date(now)
    expireAt.setDate(expireAt.getDate() + 1)

    return new RecoverPassword(token ?? UuidGenerator.v4(), now, expireAt)
  }

  getToken(): string {
    return this.token
  }

  getRequestedAt(): Date {
    return this.requestedAt
  }

  getExpireAt(): Date {
    return this.expireAt
  }
}
