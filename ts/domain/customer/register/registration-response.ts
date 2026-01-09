import type { Customer } from '../customer.ts'

export class RegistrationResponse {
  constructor(
    private readonly customer: Customer | null,
    private readonly errors: string[] = []
  ) {}

  getCustomer(): Customer | null {
    return this.customer
  }

  getErrors(): string[] {
    return this.errors
  }
}
