export interface PasswordEncoder {
  encode(plain: string): Promise<string>
  check(encoded: string, plain: string): Promise<boolean>
}
