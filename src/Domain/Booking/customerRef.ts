import type { CustomerId } from "../Customer/customerId";
import type { Email } from "../Customer/email";
import type { Profile } from "../Customer/profile";

export class CustomerRef {
	constructor(
		readonly id: CustomerId,
		readonly email: Email,
		readonly profile: Profile,
	) {}

	static create(id: CustomerId, email: Email, profile: Profile): CustomerRef {
		return new CustomerRef(id, email, profile);
	}
}
