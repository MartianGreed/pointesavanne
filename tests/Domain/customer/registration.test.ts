import { describe, expect, it } from "bun:test";
import { RegistrationRequest } from "../../../src/Domain/Customer/Register/registrationRequest";
import { RegistrationUseCase } from "../../../src/Domain/Customer/Register/registrationUseCase";
import { InMemoryMailer } from "../../../src/Infrastructure/Email/inMemoryMailer";
import { BunPasswordEncoder } from "../../../src/Infrastructure/auth/bunPasswordEncoder";
import { InMemoryCustomerRepository } from "../../../src/Infrastructure/repository/inMemoryCustomerRepository";

describe("RegistrationUseCase", () => {
	const createUseCase = () => {
		const passwordEncoder = new BunPasswordEncoder();
		const customerRepository = new InMemoryCustomerRepository();
		const mailer = new InMemoryMailer();
		return {
			useCase: new RegistrationUseCase(
				passwordEncoder,
				customerRepository,
				mailer,
			),
			customerRepository,
			mailer,
		};
	};

	it("should register a new customer", async () => {
		const { useCase, mailer } = createUseCase();
		const request = new RegistrationRequest(
			"test@example.com",
			"password123",
			"+33612345678",
			"John",
			"Doe",
		);

		const response = await useCase.execute(request);

		expect(response.success).toBe(true);
		expect(response.errors).toHaveLength(0);
		expect(mailer.getSentMessages()).toHaveLength(1);
	});

	it("should fail when customer already exists", async () => {
		const { useCase } = createUseCase();
		const request = new RegistrationRequest(
			"test@example.com",
			"password123",
			"+33612345678",
			"John",
			"Doe",
		);

		await useCase.execute(request);
		const response = await useCase.execute(request);

		expect(response.success).toBe(false);
		expect(response.errors).toContain(
			"A customer with this email already exists",
		);
	});
});
