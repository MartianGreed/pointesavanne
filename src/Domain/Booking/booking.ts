import type { File } from "../Shared/file";
import { BookingId } from "./bookingId";
import type { CustomerRef } from "./customerRef";
import { FormattedBookingDates } from "./formattedBookingDates";
import type { PricingContext } from "./pricingContext";
import { Status } from "./status";
import { Transition } from "./transition";
import type { Villa } from "./villa";

export class Booking {
	private constructor(
		readonly id: BookingId,
		readonly villa: Villa,
		readonly customer: CustomerRef,
		readonly from: Date,
		readonly to: Date,
		readonly adultsCount: number,
		readonly childrenCount: number,
		private _status: Status,
		private _pricingContext: PricingContext,
		private _transitions: Transition[],
		private _files: File[],
		readonly createdAt: Date,
		private _updatedAt: Date,
	) {}

	static request(
		villa: Villa,
		customer: CustomerRef,
		from: Date,
		to: Date,
		adultsCount: number,
		childrenCount: number,
		pricingContext: PricingContext,
	): Booking {
		FormattedBookingDates.create(from, to);

		const now = new Date();
		return new Booking(
			BookingId.build(),
			villa,
			customer,
			from,
			to,
			adultsCount,
			childrenCount,
			Status.QUOTATION_REQUESTED,
			pricingContext,
			[],
			[],
			now,
			now,
		);
	}

	get status(): Status {
		return this._status;
	}

	get pricingContext(): PricingContext {
		return this._pricingContext;
	}

	get transitions(): Transition[] {
		return [...this._transitions];
	}

	get files(): File[] {
		return [...this._files];
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	getFormattedDates(): FormattedBookingDates {
		return FormattedBookingDates.create(this.from, this.to);
	}

	transitionTo(newStatus: Status): void {
		this._transitions.push(Transition.create(this._status, newStatus));
		this._status = newStatus;
		this._updatedAt = new Date();
	}

	addFile(file: File): void {
		this._files.push(file);
		this._updatedAt = new Date();
	}

	markAsAwaitingAcceptation(): void {
		this.transitionTo(Status.QUOTATION_AWAITING_ACCEPTATION);
	}

	markAsSigned(): void {
		this.transitionTo(Status.QUOTATION_SIGNED);
	}
}
