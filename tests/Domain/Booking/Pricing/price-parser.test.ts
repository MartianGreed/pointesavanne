import { test, expect } from 'bun:test'
import { PriceParser } from '../../../../ts/domain/booking/pricing/price-parser.ts'
import { UnsupportedCurrencyException } from '../../../../ts/domain/booking/exception/unsupported-currency.ts'

test('PriceParser parses price string with euro symbol', () => {
  const parser = new PriceParser()
  const price = parser.parse('100,00€')
  expect(price.amount).toBe(100)
  expect(price.getCurrency()).toBe('€')
})

test('PriceParser parses price string with spaces', () => {
  const parser = new PriceParser()
  const price = parser.parse('100,00 €')
  expect(price.amount).toBe(100)
})

test('PriceParser parses price with decimal comma', () => {
  const parser = new PriceParser()
  const price = parser.parse('50,40€')
  expect(price.amount).toBe(50.4)
})

test('PriceParser throws for unsupported currency', () => {
  const parser = new PriceParser()
  expect(() => parser.parse('100,00$')).toThrow(UnsupportedCurrencyException)
})
