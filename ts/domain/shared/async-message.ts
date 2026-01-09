import type { Message } from './message.ts'

export interface AsyncMessage {
  dispatch(message: Message): void
}
