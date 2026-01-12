import { Mail } from '../../shared/mail.ts'

export class RegisterMail extends Mail {
  private constructor(recipients: string[], title: string, values: Record<string, unknown>) {
    super(recipients, title, values)
  }

  static new(recipients: string[], values: Record<string, unknown>, sender: string | null = null): RegisterMail {
    const mail = new RegisterMail(recipients, 'Votre compte à bien été créé !', values)
    if (sender) {
      mail.setSender(sender)
    }
    return mail
  }
}
