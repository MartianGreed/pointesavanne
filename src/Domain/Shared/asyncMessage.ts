import type { Message } from "./message";

export interface AsyncMessage {
	dispatch(message: Message): Promise<void>;
}
