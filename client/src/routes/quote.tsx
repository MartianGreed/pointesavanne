import { createFileRoute } from '@tanstack/react-router'
import { QuotationPage } from '../pages/QuotationPage'

interface QuoteSearchParams {
  from?: string
  to?: string
  adults?: number
  children?: number
}

export const Route = createFileRoute('/quote')({
  validateSearch: (search: Record<string, unknown>): QuoteSearchParams => {
    return {
      from: search.from as string | undefined,
      to: search.to as string | undefined,
      adults: search.adults ? Number(search.adults) : undefined,
      children: search.children ? Number(search.children) : undefined,
    }
  },
  component: QuotationPage,
})
