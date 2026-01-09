import type { Customer } from "./customer";
import type { Email } from "./email";

export interface CustomerRepository {
	doesCustomerWithEmailExists(email: string): Promise<boolean>;
	saveCustomer(customer: Customer): Promise<void>;
	findCustomerByEmail(email: Email): Promise<Customer | null>;
	findCustomerByResetToken(token: string): Promise<Customer | null>;
}
