import type { AsyncMessage } from '../../domain/shared/async-message.ts'
import type { Message } from '../../domain/shared/message.ts'

export class InMemoryMessageQueue implements AsyncMessage {
  private dispatchedMessages: Message[] = []

  dispatch(message: Message): void {
    this.dispatchedMessages.push(message)
  }

  getDispatchedMessages(): Message[] {
    return this.dispatchedMessages
  }
}
