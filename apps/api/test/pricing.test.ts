import { describe, expect, test } from "bun:test"
import {
  PricingContext,
  Price,
  RankedTouristTax,
  UnrankedTouristTax,
  applyPercent,
  computeQuotation,
  dates,
  parsePrice,
  type VillaPricing,
} from "../src/booking/pricing.ts"

const villa: VillaPricing = {
  villaId: "test-villa",
  name: "Villa de test",
  cautionAmount: 2000,
  householdAmount: 200,
  seasonalRanges: [
    { from: "2022-03-05", to: "2022-05-06", weeklyAmount: 1890 },
    { from: "2022-05-07", to: "2022-07-01", weeklyAmount: 1600 },
    { from: "2023-02-04", to: "2023-03-03", weeklyAmount: 2090 },
  ],
  discountRanges: [
    { fromNights: 8, toNights: 14, percent: 10 },
    { fromNights: 15, toNights: 21, percent: 15 },
  ],
}

// fr-FR number formatting uses narrow no-break spaces; normalize before
// comparing, exactly like the legacy BDD steps did.
const norm = (s: string): string => s.replace(/\s+/g, " ")

describe("Price", () => {
  test("rounds to cents at construction", () => {
    expect(new Price(100).cents).toBe(10000)
    expect(new Price(50.4).cents).toBe(5040)
    expect(new Price(0.9047).cents).toBe(90)
  })

  test("formats in fr-FR with the euro", () => {
    expect(norm(new Price(3040).format())).toBe("3 040,00 €")
    expect(norm(new Price(50.4).format())).toBe("50,40 €")
  })

  test("parses human prices", () => {
    expect(parsePrice("2 000 €").amount).toBe(2000)
    expect(parsePrice("50,40 €").cents).toBe(5040)
    expect(() => parsePrice("10 $")).toThrow()
  })

  test("percent discounts preserve the legacy cent-rounding slice", () => {
    const discounted = applyPercent(10, new Price(228.57142857))
    expect(discounted.cents).toBe(20571) // 228.5714 - 22.857 (rounded slice)
  })
})

describe("dates", () => {
  test("ISO day round-trip and day arithmetic are UTC-stable", () => {
    const d = dates.parse("2022-05-30")
    expect(dates.format(d)).toBe("30/05/2022")
    expect(dates.daysBetween(d, dates.addDays(d, 14))).toBe(14)
  })
})

describe("PricingContext (legacy algorithm)", () => {
  test("two weeks in one range: nights 1-7 full, 8-14 with 10% off", () => {
    const ctx = PricingContext.create(villa.seasonalRanges, villa.discountRanges, "2022-05-30", "2022-06-13")
    expect(norm(ctx.total().format())).toBe("3 040,00 €")
  })

  test("one week: no discount", () => {
    const ctx = PricingContext.create(villa.seasonalRanges, villa.discountRanges, "2023-02-06", "2023-02-13")
    expect(norm(ctx.total().format())).toBe("2 090,00 €")
  })

  test("three weeks: 15% from night 15", () => {
    const ctx = PricingContext.create(villa.seasonalRanges, villa.discountRanges, "2023-02-06", "2023-02-27")
    expect(norm(ctx.total().format())).toBe("5 747,50 €")
  })
})

describe("tourist taxes", () => {
  test("unranked: 2.5% of nightly per-person price, capped at 2.35 €/night (legacy case)", () => {
    // 3040 € total, 6 occupants, 14 nights, 4 adults -> 0.90 €/night/adult
    const tax = new UnrankedTouristTax(new Price(3040), 6, 14, 4)
    expect(norm(tax.get().format())).toBe("50,40 €")
  })

  test("ranked: 1.50 € per adult per night", () => {
    const tax = new RankedTouristTax(14, 4)
    expect(norm(tax.get().format())).toBe("84,00 €")
  })
})

describe("computeQuotation", () => {
  test("snapshots every amount the quotation displays (feature-pinned)", () => {
    const pricing = computeQuotation(villa, "2022-05-30", "2022-06-13", 4, 2)
    expect(pricing.totalAmount).toBe(3040)
    expect(pricing.unrankedTouristTax).toBe(50.4)
    expect(pricing.rankedTouristTax).toBe(84)
    expect(pricing.depositAmount).toBe(2000)
    expect(pricing.householdAmount).toBe(200)
  })
})
