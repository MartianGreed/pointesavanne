import { Mail } from '../../shared/mail.ts'

export class QuotationSigned extends Mail {
  static new(ownerEmail: string, from: string, to: string, customerName: string): QuotationSigned {
    return new QuotationSigned(
      [ownerEmail],
      `Devis signé - semaine du ${from} au ${to} - ${customerName}`,
      {}
    )
  }
}
