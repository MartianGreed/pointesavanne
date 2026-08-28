/**
 * Pricing engine for Villa Pointe Savanne, ported from the legacy TypeScript
 * domain (which itself ported the PHP original). The algorithms and their
 * cent-rounding behaviour are preserved exactly — the BDD features pin them.
 *
 * Everything in this module is pure: no I/O, no clock, no randomness.
 */

// ---------------------------------------------------------------------------
// Dates — ISO calendar days (yyyy-mm-dd) converted to UTC midnights so day
// arithmetic never crosses a DST boundary. Formatting is dd/MM/yyyy, the
// format used throughout the legacy domain and its features.
// ---------------------------------------------------------------------------

export const dates = {
  parse(isoDay: string): Date {
    const parsed = new Date(`${isoDay}T00:00:00.000Z`)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`invalid date "${isoDay}"`)
    }
    return parsed
  },

  toIsoDay(date: Date): string {
    return date.toISOString().slice(0, 10)
  },

  addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86_400_000)
  },

  daysBetween(from: Date, to: Date): number {
    return Math.round(Math.abs(to.getTime() - from.getTime()) / 86_400_000)
  },

  isBefore(date1: Date, date2: Date, include = false): boolean {
    const diff = date1.getTime() - date2.getTime()
    return include ? diff <= 0 : diff < 0
  },

  isAfter(date1: Date, date2: Date, include = false): boolean {
    const diff = date1.getTime() - date2.getTime()
    return include ? diff >= 0 : diff > 0
  },

  isWithin(date: Date, rangeFrom: Date, rangeTo: Date, withHead = false, withTail = false): boolean {
    return this.isAfter(date, rangeFrom, withHead) && this.isBefore(date, rangeTo, withTail)
  },

  format(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, "0")
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    return `${day}/${month}/${date.getUTCFullYear()}`
  },
}

// ---------------------------------------------------------------------------
// Money — amounts in euros as floats, rounded to cents at construction (the
// legacy Price did the same and the rounding is behaviourally significant).
// Formatting is fr-FR, e.g. "3 040,00 €".
// ---------------------------------------------------------------------------

export class Price {
  readonly cents: number

  constructor(readonly amount: number) {
    this.cents = Math.round(amount * 100)
  }

  add(other: Price): Price {
    return new Price(this.amount + other.amount)
  }

  sub(other: Price): Price {
    return new Price(this.amount - other.amount)
  }

  /** Nightly unit price: a weekly base amount split over seven nights. */
  unitPrice(): Price {
    return new Price(this.amount / 7)
  }

  format(): string {
    return `${this.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  }

  toString(): string {
    return this.format()
  }
}

/** Parses human prices such as "2 000 €" or "50,40 €" (euro only). */
export const parsePrice = (humanPrice: string): Price => {
  const sanitized = humanPrice.replace(/ /g, "")
  const currencySymbol = sanitized.replace(/[\d,.]/g, "")
  if (currencySymbol !== "€" && currencySymbol !== "EUR") {
    throw new Error(`unsupported currency "${currencySymbol}"`)
  }
  const numericPart = sanitized.replace(currencySymbol, "").replace(",", ".")
  return new Price(Number.parseFloat(numericPart))
}

// ---------------------------------------------------------------------------
// Seasonal price ranges and time-based discounts.
// ---------------------------------------------------------------------------

export interface SeasonalRange {
  readonly from: string // ISO day, inclusive
  readonly to: string // ISO day, exclusive of the walk's upper bound (see PricingContext)
  readonly weeklyAmount: number // euros per week
}

export interface DiscountRange {
  readonly fromNights: number
  readonly toNights: number
  readonly percent: number // e.g. 10 for 10%
}

class Discount {
  constructor(private readonly ranges: ReadonlyArray<DiscountRange>) {}

  forDuration(nights: number): DiscountRange | null {
    return this.ranges.find((range) => nights >= range.fromNights && nights <= range.toNights) ?? null
  }
}

/**
 * Walks the booking's nights across the villa's seasonal ranges, applying the
 * duration discount night by night (the discount kicks in from the 8th night
 * onwards with the legacy range tables).
 *
 * Ported 1:1 from the legacy PricingContext, including the two-phase walk over
 * the range containing `from` and the range containing `to`.
 */
export class PricingContext {
  private readonly prices: Price[] = []

  private constructor(
    readonly seasonalRanges: ReadonlyArray<SeasonalRange>,
    private readonly discount: Discount,
    private readonly fromAnchor: Date,
    to: Date,
  ) {
    const [rangeStart, rangeEnd] = this.rangesForPeriod(fromAnchor, to)
    if (rangeStart === null || rangeEnd === null) {
      throw new Error(`no seasonal price covers ${dates.format(fromAnchor)} - ${dates.format(to)}`)
    }

    let current = fromAnchor
    current = this.walk(current, to, rangeStart, false, true)
    this.walk(current, to, rangeEnd, true, false)
  }

  static create(
    seasonalRanges: ReadonlyArray<SeasonalRange>,
    discounts: ReadonlyArray<DiscountRange>,
    from: string,
    to: string,
  ): PricingContext {
    return new PricingContext(seasonalRanges, new Discount(discounts), dates.parse(from), dates.parse(to))
  }

  private rangesForPeriod(from: Date, to: Date): [SeasonalRange | null, SeasonalRange | null] {
    let rangeStart: SeasonalRange | null = null
    let rangeEnd: SeasonalRange | null = null
    for (const range of this.seasonalRanges) {
      const rangeFrom = dates.parse(range.from)
      const rangeTo = dates.parse(range.to)
      if (dates.isWithin(from, rangeFrom, rangeTo)) rangeStart = range
      if (dates.isWithin(to, rangeFrom, rangeTo)) rangeEnd = range
    }
    return [rangeStart, rangeEnd]
  }

  private walk(current: Date, to: Date, range: SeasonalRange, withHead: boolean, withTail: boolean): Date {
    const rangeFrom = dates.parse(range.from)
    const rangeTo = dates.parse(range.to)
    const from = this.fromAnchor
    while (
      dates.isWithin(current, rangeFrom, rangeTo, withHead, withTail) &&
      dates.isBefore(current, to)
    ) {
      current = dates.addDays(current, 1)
      const currentNight = dates.daysBetween(from, current)
      const currentDiscount = this.discount.forDuration(currentNight)
      let nightly = new Price(range.weeklyAmount).unitPrice()
      if (currentDiscount !== null) {
        nightly = applyPercent(currentDiscount.percent, nightly)
      }
      this.prices.push(nightly)
    }
    return current
  }

  total(): Price {
    return this.prices.reduce((sum, price) => sum.add(price), new Price(0))
  }
}

/**
 * Applies a percent discount to a price, preserving the legacy cent-rounding:
 * the discount slice is computed from the price's cents and rounded to cents
 * itself before subtraction.
 */
export const applyPercent = (percent: number, price: Price): Price => {
  const slice = new Price(((percent / 100) * price.cents) / 100)
  return price.sub(slice)
}

// ---------------------------------------------------------------------------
// Tourist taxes (Mauritius). Unranked villas: 2.5% of the nightly per-person
// price, capped at 2.35 € per adult per night. Ranked (4-star): 1.50 € per
// adult per night.
// ---------------------------------------------------------------------------

export class UnrankedTouristTax {
  private readonly amount: Price

  constructor(totalAmount: Price, totalOccupants: number, nightCount: number, adultsCount: number) {
    const perNight = new Price(totalAmount.amount / nightCount / totalOccupants)
    // Legacy formula: the taxed slice is what remains after removing the
    // discounted (97.5%) price — i.e. exactly 2.5% of the per-night price,
    // with cent rounding at each step.
    const discountedPerNight = applyPercent(2.5, perNight)
    let taxed = perNight.sub(discountedPerNight)
    if (taxed.cents > 235) {
      taxed = new Price(2.35)
    }
    this.amount = new Price((taxed.cents / 100) * nightCount * adultsCount)
  }

  get(): Price {
    return this.amount
  }
}

export class RankedTouristTax {
  private static readonly UNIT_AMOUNT = 1.5

  private readonly amount: Price

  constructor(nightCount: number, adultsCount: number) {
    this.amount = new Price(nightCount * adultsCount * RankedTouristTax.UNIT_AMOUNT)
  }

  get(): Price {
    return this.amount
  }
}

// ---------------------------------------------------------------------------
// Full quotation pricing for a villa stay.
// ---------------------------------------------------------------------------

export interface VillaPricing {
  readonly villaId: string
  readonly name: string
  readonly cautionAmount: number // euros, requested as deposit
  readonly householdAmount: number // euros, mandatory household
  readonly seasonalRanges: ReadonlyArray<SeasonalRange>
  readonly discountRanges: ReadonlyArray<DiscountRange>
}

export interface QuotationPricing {
  readonly totalAmount: number
  readonly unrankedTouristTax: number
  readonly rankedTouristTax: number
  readonly depositAmount: number
  readonly householdAmount: number
}

export const computeQuotation = (
  villa: VillaPricing,
  from: string,
  to: string,
  adultsCount: number,
  childrenCount: number,
): QuotationPricing => {
  const context = PricingContext.create(villa.seasonalRanges, villa.discountRanges, from, to)
  const total = context.total()
  const nights = dates.daysBetween(dates.parse(from), dates.parse(to))
  const occupants = adultsCount + childrenCount
  const round = (amount: number): number => Math.round(amount * 100) / 100
  return {
    totalAmount: round(total.amount),
    unrankedTouristTax: round(new UnrankedTouristTax(total, occupants, nights, adultsCount).get().amount),
    rankedTouristTax: round(new RankedTouristTax(nights, adultsCount).get().amount),
    depositAmount: villa.cautionAmount,
    householdAmount: villa.householdAmount,
  }
}

export const formatEuros = (amount: number): string => new Price(amount).format()
