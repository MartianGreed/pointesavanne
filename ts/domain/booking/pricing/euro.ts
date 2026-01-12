import { Currency } from './currency.ts'

export class Euro extends Currency {
  constructor() {
    super('€', 'EUR')
  }
}
