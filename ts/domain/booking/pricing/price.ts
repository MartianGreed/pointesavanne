import { Currency } from './currency.ts'
import { Euro } from './euro.ts'

export class Price {
  public readonly value: number

  constructor(
    public readonly amount: number,
    private readonly currency: Currency = new Euro()
  ) {
    this.value = Math.round(amount * 100)
  }

  getValue(): number {
    return this.value
  }

  getFormattedAmount(): string {
    return this.amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  getCurrency(): string {
    return this.currency.toString()
  }

  toString(): string {
    return `${this.getFormattedAmount()} ${this.currency}`
  }

  sub(other: Price): Price {
    return new Price(this.amount - other.amount)
  }

  getUnitPrice(): Price {
    return new Price(this.amount / 7)
  }

  add(other: Price): Price {
    return new Price(this.amount + other.amount)
  }
}
