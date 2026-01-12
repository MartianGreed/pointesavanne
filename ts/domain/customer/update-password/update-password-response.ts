import type { Customer } from '../customer.ts'

export class UpdatePasswordResponse {
  constructor(
    public readonly message: string,
    public readonly customer: Customer | null
  ) {}
}
