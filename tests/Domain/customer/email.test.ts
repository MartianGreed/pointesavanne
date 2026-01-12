import { test, expect } from 'bun:test'
import { Email } from '../../../ts/domain/customer/email.ts'

test('Email accepts valid email format', () => {
  const email = new Email('test@example.com')
  expect(email.getValue()).toBe('test@example.com')
})

test('Email toString returns the email value', () => {
  const email = new Email('test@example.com')
  expect(email.toString()).toBe('test@example.com')
})

test('Email throws for invalid format', () => {
  expect(() => new Email('invalid')).toThrow()
})

test('Email throws for missing domain', () => {
  expect(() => new Email('test@')).toThrow()
})

test('Email throws for missing local part', () => {
  expect(() => new Email('@example.com')).toThrow()
})
