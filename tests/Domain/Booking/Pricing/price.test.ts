import { test, expect } from 'bun:test'
import { Price } from '../../../../ts/domain/booking/pricing/price.ts'

test('Price stores amount and calculates value in cents', () => {
  const price = new Price(100)
  expect(price.amount).toBe(100)
  expect(price.getValue()).toBe(10000)
})

test('Price with decimals calculates value correctly', () => {
  const price = new Price(50.40)
  expect(price.getValue()).toBe(5040)
})

test('Price formats amount with French locale', () => {
  const price = new Price(3040)
  expect(price.getFormattedAmount()).toContain('3')
})

test('Price returns currency symbol', () => {
  const price = new Price(100)
  expect(price.getCurrency()).toBe('€')
})

test('Price can be added', () => {
  const price1 = new Price(100)
  const price2 = new Price(50)
  const result = price1.add(price2)
  expect(result.amount).toBe(150)
})

test('Price can be subtracted', () => {
  const price1 = new Price(100)
  const price2 = new Price(40)
  const result = price1.sub(price2)
  expect(result.amount).toBe(60)
})

test('Price toString returns formatted string with currency', () => {
  const price = new Price(100)
  const result = price.toString()
  expect(result).toContain('€')
})
