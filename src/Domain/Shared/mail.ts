export interface Mail {
	readonly to: string;
	readonly subject: string;
	readonly body: string;
}

export interface Mailer {
	addMessage(mail: Mail): void;
	send(): Promise<number>;
}
