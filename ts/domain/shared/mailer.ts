import type { Mail } from './mail.ts'

export interface Mailer {
  addMessage(mail: Mail): void
  send(): Promise<number>
}
