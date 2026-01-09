export class LoginResponse {
  constructor(
    public readonly sessionId: string | null,
    public readonly errors: string[] = []
  ) {}

  getErrors(): string[] {
    return this.errors
  }
}
