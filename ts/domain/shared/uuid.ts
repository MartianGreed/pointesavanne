export abstract class Uuid {
  protected constructor(private readonly value: string) {}

  toString(): string {
    return this.value
  }
}
