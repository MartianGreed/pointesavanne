import type { AsyncMessage } from "../../Domain/Shared/asyncMessage";
import type { Message } from "../../Domain/Shared/message";

export class InMemoryMessageQueue implements AsyncMessage {
	private messages: Message[] = [];

	async dispatch(message: Message): Promise<void> {
		this.messages.push(message);
	}

	getMessages(): Message[] {
		return [...this.messages];
	}

	clear(): void {
		this.messages = [];
	}
}
