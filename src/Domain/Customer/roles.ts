export enum Role {
	CUSTOMER = "ROLE_CUSTOMER",
	ADMIN = "ROLE_ADMIN",
}

export class Roles {
	private constructor(private readonly roles: Role[]) {}

	static default(): Roles {
		return new Roles([Role.CUSTOMER]);
	}

	static create(roles: Role[]): Roles {
		return new Roles([...roles]);
	}

	has(role: Role): boolean {
		return this.roles.includes(role);
	}

	toArray(): Role[] {
		return [...this.roles];
	}
}
