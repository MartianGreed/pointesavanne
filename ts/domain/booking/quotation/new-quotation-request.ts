import { Mail } from '../../shared/mail.ts'

export class NewQuotationRequest extends Mail {
  static new(recipient: string, values: Record<string, unknown>, sender: string | null = null): NewQuotationRequest {
    const mail = new NewQuotationRequest([recipient], 'Nouvelle demande de devis', values)
    if (sender) {
      mail.setSender(sender)
    }
    return mail
  }
}
