export class UnsupportedCurrencyException extends Error {
  constructor(currency: string) {
    super(`Currency "${currency}" is not supported`)
    this.name = 'UnsupportedCurrencyException'
  }
}
