import { Uuid } from "../Shared/uuid";

export class CustomerId extends Uuid {
	private constructor(value: string) {
		super(value);
	}

	static create(value: string): CustomerId {
		return new CustomerId(value);
	}

	static build(): CustomerId {
		return new CustomerId(Uuid.generate());
	}
}
