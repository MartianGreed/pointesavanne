export class Address {
  constructor(
    private readonly line1: string,
    private readonly line3: string | null,
    private readonly line2: string | null = null
  ) {}

  getLine1(): string {
    return this.line1
  }

  getLine2(): string | null {
    return this.line2
  }

  getLine3(): string | null {
    return this.line3
  }
}
