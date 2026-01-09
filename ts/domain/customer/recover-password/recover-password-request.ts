import type { Email } from '../email.ts'

export class RecoverPasswordRequest {
  constructor(public readonly identifier: Email) {}
}
