import type { AuthenticationGateway } from '../../domain/customer/authentication-gateway.ts'
import type { Customer } from '../../domain/customer/customer.ts'
import { CustomerIsNotLoggedInException } from '../../domain/customer/exception/customer-is-not-logged-in.ts'
import { UuidGenerator } from '../../domain/shared/uuid-generator.ts'

export class InMemoryAuthenticationGateway implements AuthenticationGateway {
  private customersLoggedIn: Map<string, Customer> = new Map()
  private currentSessionId: string | null = null

  async isCustomerLoggedIn(sessionId: string): Promise<boolean> {
    return this.customersLoggedIn.has(sessionId)
  }

  async getCustomer(sessionId: string): Promise<Customer> {
    if (!(await this.isCustomerLoggedIn(sessionId))) {
      throw new CustomerIsNotLoggedInException()
    }
    return this.customersLoggedIn.get(sessionId)!
  }

  async logCustomerIn(customer: Customer): Promise<string> {
    const sessionId = UuidGenerator.v4()
    this.customersLoggedIn.set(sessionId, customer)
    this.currentSessionId = sessionId
    return sessionId
  }

  async getCurrentLoggedInCustomer(): Promise<Customer> {
    return this.getCustomer(this.currentSessionId!)
  }
}
