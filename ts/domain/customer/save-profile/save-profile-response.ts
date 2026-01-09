import type { Customer } from '../customer.ts'

export class SaveProfileResponse {
  constructor(
    private readonly customer: Customer | null,
    private readonly errors: Record<string, string> = {}
  ) {}

  getCustomer(): Customer | null {
    return this.customer
  }

  getErrors(): Record<string, string> {
    return this.errors
  }
}
