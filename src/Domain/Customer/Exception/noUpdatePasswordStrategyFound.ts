export class NoUpdatePasswordStrategyFound extends Error {
	constructor() {
		super("No update strategy found. Please contact administrator");
		this.name = "NoUpdatePasswordStrategyFound";
	}
}
