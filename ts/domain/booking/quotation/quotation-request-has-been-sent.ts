import { Mail } from '../../shared/mail.ts'

export class QuotationRequestHasBeenSent extends Mail {
  static new(
    recipient: string,
    values: Record<string, unknown>,
    sender: string | null = null
  ): QuotationRequestHasBeenSent {
    const mail = new QuotationRequestHasBeenSent([recipient], 'Votre demande de devis', values)
    if (sender) {
      mail.setSender(sender)
    }
    return mail
  }
}
