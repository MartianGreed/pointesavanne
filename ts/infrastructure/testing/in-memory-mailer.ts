import type { Mailer } from '../../domain/shared/mailer.ts'
import type { Mail } from '../../domain/shared/mail.ts'

export class InMemoryMailer implements Mailer {
  private toSend: Mail[] = []
  private sent: Mail[] = []
  private sentHistory: Mail[] = []

  constructor(private readonly sender: string) {}

  addMessage(mail: Mail): void {
    this.toSend.push(mail)
  }

  async send(): Promise<number> {
    if (this.sent.length > 0) {
      this.sentHistory = [...this.sentHistory, ...this.sent]
      this.sent = []
    }

    for (const mail of this.toSend) {
      if (mail.getSender() === null) {
        mail.setSender(this.sender)
      }
      this.sent.push(mail)
    }
    this.toSend = []

    return this.sent.length
  }

  getSent(): Mail[] {
    return this.sent
  }
}
