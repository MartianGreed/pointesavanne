import type { AuthenticationGateway } from "../../Domain/Customer/authenticationGateway";
import type { Customer } from "../../Domain/Customer/customer";
import { Uuid } from "../../Domain/Shared/uuid";

export class InMemoryAuthenticationGateway implements AuthenticationGateway {
	private sessions: Map<string, Customer> = new Map();
	private currentLoggedInCustomer: Customer | null = null;

	async isCustomerLoggedIn(sessionId: string): Promise<boolean> {
		return this.sessions.has(sessionId);
	}

	async getCustomer(sessionId: string): Promise<Customer> {
		const customer = this.sessions.get(sessionId);
		if (!customer) {
			throw new Error("Customer not found for session");
		}
		return customer;
	}

	async logCustomerIn(customer: Customer): Promise<string> {
		const sessionId = Uuid.generate();
		this.sessions.set(sessionId, customer);
		this.currentLoggedInCustomer = customer;
		return sessionId;
	}

	async getCurrentLoggedInCustomer(): Promise<Customer> {
		if (!this.currentLoggedInCustomer) {
			throw new Error("No customer is currently logged in");
		}
		return this.currentLoggedInCustomer;
	}

	setCurrentLoggedInCustomer(customer: Customer): void {
		this.currentLoggedInCustomer = customer;
	}

	clear(): void {
		this.sessions.clear();
		this.currentLoggedInCustomer = null;
	}
}
