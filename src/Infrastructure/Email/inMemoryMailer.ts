import type { Mail, Mailer } from "../../Domain/Shared/mail";

export class InMemoryMailer implements Mailer {
	private messages: Mail[] = [];
	private sentMessages: Mail[] = [];

	addMessage(mail: Mail): void {
		this.messages.push(mail);
	}

	async send(): Promise<number> {
		const count = this.messages.length;
		this.sentMessages.push(...this.messages);
		this.messages = [];
		return count;
	}

	getSentMessages(): Mail[] {
		return [...this.sentMessages];
	}

	getPendingMessages(): Mail[] {
		return [...this.messages];
	}

	clear(): void {
		this.messages = [];
		this.sentMessages = [];
	}
}
