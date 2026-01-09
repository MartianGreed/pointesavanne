import { Mail } from '../../shared/mail.ts'

export class RecoverPasswordMail extends Mail {
  static new(recipients: string[], values: Record<string, unknown>, sender: string | null = null): RecoverPasswordMail {
    const mail = new RecoverPasswordMail(recipients, 'Réinitialisation de votre mot de passe', values)
    if (sender) {
      mail.setSender(sender)
    }
    return mail
  }
}
