import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { PasswordEncoder } from '../../domain/customer/password-encoder.ts'

const scryptAsync = promisify(scrypt)

export class NodePasswordEncoder implements PasswordEncoder {
  async encode(plain: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const hash = (await scryptAsync(plain, salt, 64)) as Buffer
    return `${salt}:${hash.toString('hex')}`
  }

  async check(encoded: string, plain: string): Promise<boolean> {
    const [salt, storedHash] = encoded.split(':')
    if (!salt || !storedHash) return false
    const hash = (await scryptAsync(plain, salt, 64)) as Buffer
    return timingSafeEqual(Buffer.from(storedHash, 'hex'), hash)
  }
}
