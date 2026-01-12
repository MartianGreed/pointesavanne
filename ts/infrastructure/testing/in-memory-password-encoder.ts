import { createHash } from 'node:crypto'
import type { PasswordEncoder } from '../../domain/customer/password-encoder.ts'

export class InMemoryPasswordEncoder implements PasswordEncoder {
  async encode(plain: string): Promise<string> {
    return createHash('sha256').update(plain).digest('hex')
  }

  async check(encoded: string, plain: string): Promise<boolean> {
    const hashed = await this.encode(plain)
    return encoded === hashed
  }
}
