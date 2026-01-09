import type { PasswordEncoder } from '../../domain/customer/password-encoder.ts'

export class BunPasswordEncoder implements PasswordEncoder {
  async encode(plain: string): Promise<string> {
    return Bun.password.hash(plain)
  }

  async check(encoded: string, plain: string): Promise<boolean> {
    return Bun.password.verify(plain, encoded)
  }
}
