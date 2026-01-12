import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { api } from '../api/client'

export function PricingSection() {
  const { data: pricing, isLoading } = useQuery({
    queryKey: ['seasonalPricing'],
    queryFn: api.getSeasonalPricing,
  })

  return (
    <section className="py-24 bg-luxury-cream/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-luxury-gold text-sm tracking-[0.2em] mb-4">RATES</p>
          <h2 className="section-heading mb-4">Seasonal Pricing</h2>
          <p className="section-subheading max-w-2xl mx-auto">
            Weekly rates vary by season. Extended stays qualify for special discounts.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ) : pricing?.ranges ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-luxury-charcoal text-white">
                    <th className="py-4 px-6 text-left font-medium tracking-wider text-sm">PERIOD</th>
                    <th className="py-4 px-6 text-right font-medium tracking-wider text-sm">WEEKLY RATE</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.ranges.map((range, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="py-4 px-6">
                        <span className="text-gray-600">
                          {range.from} — {range.to}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-serif text-xl text-luxury-gold">
                          {range.weeklyPrice.formatted}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600 mb-4">
                Contact us for current seasonal rates and availability.
              </p>
              <Link to="/quote" className="btn-primary">
                Request a Quote
              </Link>
            </div>
          )}

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-serif text-lg mb-3">Extended Stay Discount</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex justify-between">
                  <span>8-14 nights</span>
                  <span className="font-medium text-luxury-gold">10% off</span>
                </li>
                <li className="flex justify-between">
                  <span>15+ nights</span>
                  <span className="font-medium text-luxury-gold">15% off</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-serif text-lg mb-3">Additional Fees</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex justify-between">
                  <span>Household fee</span>
                  <span>Included</span>
                </li>
                <li className="flex justify-between">
                  <span>Tourist tax</span>
                  <span>Per adult/night</span>
                </li>
                <li className="flex justify-between">
                  <span>Security deposit</span>
                  <span>Refundable</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
