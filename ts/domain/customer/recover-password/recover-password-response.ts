export class RecoverPasswordResponse {
  constructor(
    public readonly message: string | null = null,
    public readonly errors: Record<string, string> = {}
  ) {}
}
