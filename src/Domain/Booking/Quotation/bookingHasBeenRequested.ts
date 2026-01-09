import type { Message } from "../../Shared/message";
import type { BookingId } from "../bookingId";

export class BookingHasBeenRequested implements Message {
	readonly occurredAt: Date;

	constructor(readonly bookingId: BookingId) {
		this.occurredAt = new Date();
	}
}
