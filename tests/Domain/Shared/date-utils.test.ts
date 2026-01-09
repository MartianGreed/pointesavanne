import { test, expect } from 'bun:test'
import { DateUtils } from '../../../ts/domain/shared/date-utils.ts'

test('DateUtils.getDate parses dd/mm/yyyy format', () => {
  const date = DateUtils.getDate('01/06/2022')
  expect(date.getDate()).toBe(1)
  expect(date.getMonth()).toBe(5)
  expect(date.getFullYear()).toBe(2022)
})

test('DateUtils.getDate parses dd/mm/yyyy HH:mm format', () => {
  const date = DateUtils.getDate('01/06/2022 14:30')
  expect(date.getHours()).toBe(14)
  expect(date.getMinutes()).toBe(30)
})

test('DateUtils.getDate returns now for "now"', () => {
  const before = new Date()
  const date = DateUtils.getDate('now')
  const after = new Date()
  expect(date.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
  expect(date.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
})

test('DateUtils.isBefore returns true when date1 is before date2', () => {
  const date1 = new Date(2022, 0, 1)
  const date2 = new Date(2022, 5, 1)
  expect(DateUtils.isBefore(date1, date2)).toBe(true)
})

test('DateUtils.isAfter returns true when date1 is after date2', () => {
  const date1 = new Date(2022, 5, 1)
  const date2 = new Date(2022, 0, 1)
  expect(DateUtils.isAfter(date1, date2)).toBe(true)
})

test('DateUtils.daysBetween calculates correct number of days', () => {
  const from = new Date(2022, 0, 1)
  const to = new Date(2022, 0, 15)
  expect(DateUtils.daysBetween(from, to)).toBe(14)
})

test('DateUtils.addDays adds days correctly', () => {
  const date = new Date(2022, 0, 1)
  const result = DateUtils.addDays(date, 7)
  expect(result.getDate()).toBe(8)
})

test('DateUtils.formatDate returns dd/mm/yyyy format', () => {
  const date = new Date(2022, 5, 1)
  expect(DateUtils.formatDate(date)).toBe('01/06/2022')
})
