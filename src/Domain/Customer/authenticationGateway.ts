import type { Customer } from "./customer";

export interface AuthenticationGateway {
	isCustomerLoggedIn(sessionId: string): Promise<boolean>;
	getCustomer(sessionId: string): Promise<Customer>;
	logCustomerIn(customer: Customer): Promise<string>;
	getCurrentLoggedInCustomer(): Promise<Customer>;
}
