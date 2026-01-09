import { Uuid } from "../Shared/uuid";

export class BookingId extends Uuid {
	private constructor(value: string) {
		super(value);
	}

	static create(value: string): BookingId {
		return new BookingId(value);
	}

	static build(): BookingId {
		return new BookingId(Uuid.generate());
	}
}
