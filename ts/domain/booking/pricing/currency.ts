export abstract class Currency {
  constructor(
    public readonly symbol: string,
    public readonly value: string
  ) {}

  toString(): string {
    return this.symbol
  }
}
