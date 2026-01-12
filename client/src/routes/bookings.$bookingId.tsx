import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { api } from '@/lib/api'

export const Route = createFileRoute('/bookings/$bookingId')({
  beforeLoad: () => {
    const user = localStorage.getItem('user')
    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
  component: BookingDetailPage,
})

const statusSteps = [
  { key: 'quotation-requested', label: 'Requested', description: 'Your quotation has been requested' },
  { key: 'quotation-awaiting-acceptation', label: 'Review', description: 'Quotation ready for review and signature' },
  { key: 'quotation-signed', label: 'Signed', description: 'Quotation signed and confirmed' },
]

function BookingDetailPage() {
  const { bookingId } = Route.useParams()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api.getBooking(bookingId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadSignedQuotation(bookingId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setUploadError(null)
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Please upload a PDF file')
        return
      }
      uploadMutation.mutate(file)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="text-luxury-500">Loading booking details...</div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading booking details.</p>
          <Link to="/bookings" className="btn-secondary">
            Back to Bookings
          </Link>
        </div>
      </div>
    )
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === booking.status)

  return (
    <div className="min-h-[calc(100vh-72px)] py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 text-luxury-600 hover:text-luxury-900 mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Bookings
        </Link>

        <div className="bg-white border border-luxury-200 overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-luxury-200 bg-luxury-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-luxury-500 text-sm mb-1">Booking Reference</p>
                <h1 className="font-serif text-2xl text-luxury-900">
                  #{booking.id.slice(0, 8).toUpperCase()}
                </h1>
              </div>
              <div className="text-right">
                <p className="text-luxury-500 text-sm mb-1">Total Amount</p>
                <p className="font-serif text-2xl text-luxury-900">
                  {booking.pricing.totalAmount}
                </p>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="p-8 border-b border-luxury-200">
            <h2 className="font-medium text-luxury-900 mb-6">Booking Status</h2>
            <div className="flex items-start">
              {statusSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex
                const isCurrent = index === currentStepIndex

                return (
                  <div key={step.key} className="flex-1 relative">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-gold-600 text-white'
                            : 'bg-luxury-200 text-luxury-500'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < statusSteps.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 ${
                            isCompleted ? 'bg-green-500' : 'bg-luxury-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="mt-3 pr-4">
                      <p
                        className={`text-sm font-medium ${
                          isCurrent ? 'text-gold-700' : isCompleted ? 'text-green-700' : 'text-luxury-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-luxury-500 mt-1">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Booking Details */}
          <div className="p-8 border-b border-luxury-200">
            <h2 className="font-medium text-luxury-900 mb-6">Reservation Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-luxury-500 mb-1">Check-in</p>
                <p className="font-medium text-luxury-900">{booking.from}</p>
              </div>
              <div>
                <p className="text-sm text-luxury-500 mb-1">Check-out</p>
                <p className="font-medium text-luxury-900">{booking.to}</p>
              </div>
              <div>
                <p className="text-sm text-luxury-500 mb-1">Duration</p>
                <p className="font-medium text-luxury-900">{booking.pricing.nightsIn} nights</p>
              </div>
              <div>
                <p className="text-sm text-luxury-500 mb-1">Guests</p>
                <p className="font-medium text-luxury-900">
                  {booking.adultsCount} adult{booking.adultsCount > 1 ? 's' : ''}
                  {booking.childrenCount > 0 &&
                    `, ${booking.childrenCount} child${booking.childrenCount > 1 ? 'ren' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-8 border-b border-luxury-200">
            <h2 className="font-medium text-luxury-900 mb-6">Pricing Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-luxury-600">Accommodation ({booking.pricing.nightsIn} nights)</span>
                <span className="text-luxury-900">{booking.pricing.totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-luxury-600">Household Fee</span>
                <span className="text-luxury-900">{booking.pricing.householdTax}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-luxury-600">Tourist Tax</span>
                <span className="text-luxury-900">{booking.pricing.touristTax}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-luxury-200">
                <span className="font-medium text-luxury-900">Total</span>
                <span className="font-medium text-luxury-900">{booking.pricing.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {booking.status === 'quotation-awaiting-acceptation' && (
            <div className="p-8 bg-gold-50">
              <h2 className="font-medium text-luxury-900 mb-4">Sign Your Quotation</h2>
              <p className="text-luxury-600 text-sm mb-6">
                Please download the quotation PDF, sign it, and upload the signed version to proceed.
              </p>

              {uploadError && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                  {uploadError}
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <button className="btn-secondary">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Quotation
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadMutation.isPending ? (
                    'Uploading...'
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Upload Signed Quotation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {booking.status === 'quotation-signed' && (
            <div className="p-8 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-medium text-green-800">Quotation Signed</h2>
                  <p className="text-green-700 text-sm">
                    Thank you! We'll be in touch shortly to confirm your booking.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
