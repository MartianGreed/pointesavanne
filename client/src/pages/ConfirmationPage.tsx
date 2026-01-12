import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Calendar, Users, Mail, Phone, Loader2 } from 'lucide-react'
import { api } from '../api/client'

export function ConfirmationPage() {
  const { id } = useParams({ from: '/confirmation/$id' })

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => api.getQuotation(id),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-luxury-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-2xl mx-auto px-6">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="section-heading text-3xl mb-4">Booking Confirmed!</h1>
          <p className="text-gray-600 text-lg">
            Thank you for choosing Villa Pointe Savanne. We&apos;ve received your signed quotation
            and are excited to host you.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="text-center pb-6 border-b mb-6">
            <p className="text-sm text-gray-500 mb-1">Confirmation Number</p>
            <p className="text-2xl font-serif text-luxury-gold">
              #{quotation?.numericId || id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {quotation && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Calendar className="w-5 h-5 text-luxury-gold mt-1" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Your Stay</p>
                  <p className="font-medium">
                    {quotation.from} — {quotation.to}
                  </p>
                  <p className="text-sm text-gray-600">{quotation.pricing.nightsIn} nights</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Users className="w-5 h-5 text-luxury-gold mt-1" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Guests</p>
                  <p className="font-medium">
                    {quotation.adultsCount} Adults
                    {quotation.childrenCount > 0 && `, ${quotation.childrenCount} Children`}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-2xl font-serif text-luxury-gold">
                    {quotation.pricing.totalAmount.formatted}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="font-serif text-xl mb-6">What Happens Next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-luxury-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm text-luxury-gold font-medium">1</span>
              </div>
              <div>
                <p className="font-medium">Confirmation Email</p>
                <p className="text-sm text-gray-600">
                  You&apos;ll receive a confirmation email with your booking details and payment instructions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-luxury-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm text-luxury-gold font-medium">2</span>
              </div>
              <div>
                <p className="font-medium">Secure Your Booking</p>
                <p className="text-sm text-gray-600">
                  Complete the payment to secure your dates. A deposit is required to confirm your reservation.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-luxury-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm text-luxury-gold font-medium">3</span>
              </div>
              <div>
                <p className="font-medium">Pre-Arrival Information</p>
                <p className="text-sm text-gray-600">
                  We&apos;ll send you all the details you need before your arrival, including directions and
                  check-in instructions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-luxury-charcoal text-white rounded-xl p-8 text-center">
          <h2 className="font-serif text-xl mb-4">Need Assistance?</h2>
          <p className="text-white/80 mb-6">
            Our concierge team is here to help with any questions about your upcoming stay.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="mailto:contact@pointesavanne.com"
              className="flex items-center gap-2 text-luxury-champagne hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4" />
              contact@pointesavanne.com
            </a>
            <a
              href="tel:+2301234567"
              className="flex items-center gap-2 text-luxury-champagne hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              +230 123 4567
            </a>
          </div>
        </div>

        {/* Return Home */}
        <div className="text-center mt-8">
          <Link to="/" className="btn-secondary">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
