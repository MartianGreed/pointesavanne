import { Price } from '../../domain/booking/pricing/price.ts'

export interface QuotationTemplateData {
  numeric_id: number
  address: {
    name: string
    line1: string
    line2: string | null
    line3: string
    phone: string
    email: string
  }
  pricing: {
    nightsIn: number
    household_tax: Price
    total_amount: Price
    tourist_tax: Price
  }
  from: string
  to: string
  total_occupants: number
  adults_count: number
  children_count: number
  created_at: string
}

export function createHomeRoute() {
  return {
    GET: () => {
      const data: QuotationTemplateData = {
        numeric_id: 1,
        address: {
          name: 'Valentin Dosimont',
          line1: '25 place Grégoire Bordillon',
          line2: null,
          line3: '49100 Angers',
          phone: '0782848227',
          email: 'valentin.dosimont@gmail.com',
        },
        pricing: {
          nightsIn: 14,
          household_tax: new Price(200),
          total_amount: new Price(3040),
          tourist_tax: new Price(50.40),
        },
        from: '30/05/2022',
        to: '13/06/2022',
        total_occupants: 6,
        adults_count: 4,
        children_count: 2,
        created_at: '27/05/2022',
      }

      return Response.json(data)
    },
  }
}
