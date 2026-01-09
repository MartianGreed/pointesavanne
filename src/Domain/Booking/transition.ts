import type { Status } from "./status";

export class Transition {
	constructor(
		readonly from: Status,
		readonly to: Status,
		readonly occurredAt: Date,
	) {}

	static create(from: Status, to: Status): Transition {
		return new Transition(from, to, new Date());
	}
}
