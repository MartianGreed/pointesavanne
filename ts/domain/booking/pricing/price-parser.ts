import { Currency } from './currency.ts'
import { Euro } from './euro.ts'
import { Price } from './price.ts'
import { UnsupportedCurrencyException } from '../exception/unsupported-currency.ts'

export class PriceParser {
  private readonly currencies: Currency[]

  constructor() {
    this.currencies = [new Euro()]
  }

  parse(humanPrice: string): Price {
    const sanitizedString = humanPrice.replace(/ /g, '')
    const currencySymbol = sanitizedString.replace(/[\d,\.]/g, '')
    const numericPart = sanitizedString.replace(currencySymbol, '').replace(',', '.')
    const amount = parseFloat(numericPart)
    const currency = this.getCurrency(currencySymbol)

    return new Price(amount, currency)
  }

  private getCurrency(symbol: string): Currency {
    const currency = this.currencies.find((c) => c.symbol === symbol)
    if (!currency) {
      throw new UnsupportedCurrencyException(symbol)
    }
    return currency
  }
}
