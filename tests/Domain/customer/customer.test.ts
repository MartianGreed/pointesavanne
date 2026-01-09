import { describe, expect, it } from "bun:test";
import { Address } from "../../../src/Domain/Customer/address";
import { Customer } from "../../../src/Domain/Customer/customer";

describe("Customer", () => {
	const createCustomer = () =>
		Customer.register(
			"test@example.com",
			"hashed_password",
			"+33612345678",
			"John",
			"Doe",
		);

	it("should register a new customer", () => {
		const customer = createCustomer();
		expect(customer.email.toString()).toBe("test@example.com");
		expect(customer.profile.firstname).toBe("John");
		expect(customer.profile.lastname).toBe("Doe");
		expect(customer.profile.phoneNumber).toBe("+33612345678");
	});

	it("should update profile", () => {
		const customer = createCustomer();
		customer.updateProfile({ firstname: "Jane" });
		expect(customer.profile.firstname).toBe("Jane");
		expect(customer.profile.lastname).toBe("Doe");
	});

	it("should update address", () => {
		const customer = createCustomer();
		const address = Address.create("123 Main St", "Apt 4");
		customer.updateProfile({ address });
		expect(customer.address?.line1).toBe("123 Main St");
		expect(customer.address?.line2).toBe("Apt 4");
	});

	it("should record login", () => {
		const customer = createCustomer();
		expect(customer.lastLoginAt).toBeNull();
		customer.logIn();
		expect(customer.lastLoginAt).not.toBeNull();
	});

	it("should handle password recovery", () => {
		const customer = createCustomer();
		expect(customer.recoverPasswordRequest).toBeNull();
		customer.recoverPassword();
		expect(customer.recoverPasswordRequest).not.toBeNull();
		expect(customer.recoverPasswordRequest?.token).toBeDefined();
	});

	it("should update password and clear recovery request", () => {
		const customer = createCustomer();
		customer.recoverPassword();
		customer.updatePassword("new_hashed_password");
		expect(customer.password).toBe("new_hashed_password");
		expect(customer.recoverPasswordRequest).toBeNull();
	});
});
