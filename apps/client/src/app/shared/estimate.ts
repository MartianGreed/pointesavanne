/**
 * The villa's public price card, mirrored from the design: a weekly base
 * price, duration discounts, a mandatory household fee and the deposit.
 * The exact quotation (seasonal pricing, tourist taxes) comes from the API
 * once the request is submitted — these constants power the live estimates.
 */

export const WEEKLY_BASE = 1600
export const HOUSEHOLD_AMOUNT = 200
export const DEPOSIT_AMOUNT = 2000

export interface StayEstimate {
  readonly nights: number
  readonly nightly: number
  readonly subtotal: number
  readonly discountPercent: number
  readonly discountAmount: number
  readonly household: number
  readonly total: number
}

/** Whole nights between two ISO days; 0 when the range is empty or invalid. */
export const nightsBetween = (from: string, to: string): number => {
  if (from === "" || to === "") return 0
  const nights = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
  return nights > 0 ? nights : 0
}

/** The design's estimation formula, used before the API quotation exists. */
export const estimateStay = (from: string, to: string, weekly = WEEKLY_BASE): StayEstimate | null => {
  const nights = nightsBetween(from, to)
  if (nights === 0) return null
  const nightly = weekly / 7
  const subtotal = Math.round(nightly * nights)
  const discountPercent = nights >= 15 ? 15 : nights >= 8 ? 10 : 0
  const discountAmount = Math.round(subtotal * (discountPercent / 100))
  return {
    nights,
    nightly: Math.round(nightly),
    subtotal,
    discountPercent,
    discountAmount,
    household: HOUSEHOLD_AMOUNT,
    total: subtotal - discountAmount + HOUSEHOLD_AMOUNT,
  }
}

/** "1 680 €" — the design's whole-euro formatting for estimates. */
export const euros = (amount: number): string => `${amount.toLocaleString("fr-FR")} €`
