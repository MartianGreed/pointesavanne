import { Mail } from '../../shared/mail.ts'

export class QuotationHasBeenGenerated extends Mail {
  static new(recipient: string, values: Record<string, unknown> = {}): QuotationHasBeenGenerated {
    return new QuotationHasBeenGenerated([recipient], 'Location Pointe-Savanne - Devis', values)
  }
}
