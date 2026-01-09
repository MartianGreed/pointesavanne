import type { Customer } from "../../Domain/Customer/customer";
import type { CustomerRepository } from "../../Domain/Customer/customerRepository";
import type { Email } from "../../Domain/Customer/email";

export class InMemoryCustomerRepository implements CustomerRepository {
	private customers: Map<string, Customer> = new Map();

	async doesCustomerWithEmailExists(email: string): Promise<boolean> {
		return this.customers.has(email.toLowerCase());
	}

	async saveCustomer(customer: Customer): Promise<void> {
		this.customers.set(customer.email.toString(), customer);
	}

	async findCustomerByEmail(email: Email): Promise<Customer | null> {
		return this.customers.get(email.toString()) ?? null;
	}

	async findCustomerByResetToken(token: string): Promise<Customer | null> {
		for (const customer of this.customers.values()) {
			if (customer.recoverPasswordRequest?.token === token) {
				return customer;
			}
		}
		return null;
	}

	clear(): void {
		this.customers.clear();
	}
}
