import { test, expect } from 'bun:test'
import { BunPasswordEncoder } from '../../../ts/infrastructure/password/bun-password-encoder.ts'

test('BunPasswordEncoder encodes password', async () => {
  const encoder = new BunPasswordEncoder()
  const encoded = await encoder.encode('password123')
  expect(encoded).not.toBe('password123')
  expect(encoded.length).toBeGreaterThan(0)
})

test('BunPasswordEncoder verifies correct password', async () => {
  const encoder = new BunPasswordEncoder()
  const encoded = await encoder.encode('password123')
  const result = await encoder.check(encoded, 'password123')
  expect(result).toBe(true)
})

test('BunPasswordEncoder rejects incorrect password', async () => {
  const encoder = new BunPasswordEncoder()
  const encoded = await encoder.encode('password123')
  const result = await encoder.check(encoded, 'wrongpassword')
  expect(result).toBe(false)
})
