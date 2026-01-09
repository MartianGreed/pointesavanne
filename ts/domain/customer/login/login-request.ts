import { Email } from '../email.ts'

export class LoginRequest {
  constructor(
    public readonly email: Email,
    public readonly plainPassword: string
  ) {}
}
