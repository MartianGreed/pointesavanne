import type { CustomerRepository } from '../../domain/customer/customer-repository.ts'
import type { Customer } from '../../domain/customer/customer.ts'
import type { Email } from '../../domain/customer/email.ts'

export class InMemoryCustomerRepository implements CustomerRepository {
  private customers: Map<string, Customer> = new Map()

  async doesCustomerWithEmailExists(email: string): Promise<boolean> {
    return this.customers.has(email)
  }

  async saveCustomer(customer: Customer): Promise<void> {
    this.customers.set(customer.getEmail(), customer)
  }

  async findCustomerByEmail(email: Email): Promise<Customer | null> {
    return this.customers.get(email.getValue()) ?? null
  }

  async findCustomerByResetToken(token: string): Promise<Customer | null> {
    for (const customer of this.customers.values()) {
      if (customer.getRecoverPassword()?.getToken() === token) {
        return customer
      }
    }
    return null
  }
}
