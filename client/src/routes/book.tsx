import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { daysBetween } from '@/lib/utils'

export const Route = createFileRoute('/book')({
  component: BookPage,
})

interface BookingForm {
  from: string
  to: string
  adultsCount: number
  childrenCount: number
}

function BookPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [step, setStep] = useState<'dates' | 'guests' | 'review' | 'confirm'>('dates')

  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingForm>({
    defaultValues: {
      adultsCount: 2,
      childrenCount: 0,
    },
  })

  const { data: availability } = useQuery({
    queryKey: ['availability'],
    queryFn: api.getAvailableDates,
  })

  const quotationMutation = useMutation({
    mutationFn: api.requestQuotation,
    onSuccess: (data) => {
      navigate({ to: '/bookings/$bookingId', params: { bookingId: data.bookingId } })
    },
  })

  const fromDate = watch('from')
  const toDate = watch('to')
  const adultsCount = watch('adultsCount')
  const childrenCount = watch('childrenCount')

  const nights = fromDate && toDate ? daysBetween(new Date(fromDate), new Date(toDate)) : 0
  const totalOccupants = (adultsCount || 0) + (childrenCount || 0)

  const getDiscount = () => {
    if (nights >= 15) return { percent: 15, label: '15% off for 15+ nights' }
    if (nights >= 8) return { percent: 10, label: '10% off for 8-14 nights' }
    return null
  }

  const discount = getDiscount()

  const onSubmit = (data: BookingForm) => {
    if (!isAuthenticated) {
      navigate({ to: '/login' })
      return
    }

    quotationMutation.mutate({
      villaId: 'pointe-savanne',
      from: data.from,
      to: data.to,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
    })
  }

  const nextStep = () => {
    if (step === 'dates') setStep('guests')
    else if (step === 'guests') setStep('review')
    else if (step === 'review') setStep('confirm')
  }

  const prevStep = () => {
    if (step === 'guests') setStep('dates')
    else if (step === 'review') setStep('guests')
    else if (step === 'confirm') setStep('review')
  }

  return (
    <div className="min-h-[calc(100vh-72px)] py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-subheading mb-4">Begin Your Journey</p>
          <h1 className="section-heading">Request a Quotation</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {['dates', 'guests', 'review', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-gold-600 text-white'
                    : ['dates', 'guests', 'review', 'confirm'].indexOf(step) > i
                    ? 'bg-luxury-900 text-white'
                    : 'bg-luxury-200 text-luxury-500'
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-16 h-0.5 ${
                    ['dates', 'guests', 'review', 'confirm'].indexOf(step) > i
                      ? 'bg-luxury-900'
                      : 'bg-luxury-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white p-8 shadow-sm border border-luxury-200">
            {/* Step 1: Dates */}
            {step === 'dates' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl text-luxury-900 mb-6">Select Your Dates</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-luxury-700 mb-2">
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      min={new Date().toISOString().split('T')[0]}
                      {...register('from', { required: 'Check-in date is required' })}
                    />
                    {errors.from && (
                      <p className="mt-1 text-sm text-red-600">{errors.from.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-luxury-700 mb-2">
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      min={fromDate || new Date().toISOString().split('T')[0]}
                      {...register('to', {
                        required: 'Check-out date is required',
                        validate: (value) =>
                          !fromDate || new Date(value) > new Date(fromDate) || 'Check-out must be after check-in',
                      })}
                    />
                    {errors.to && (
                      <p className="mt-1 text-sm text-red-600">{errors.to.message}</p>
                    )}
                  </div>
                </div>

                {nights > 0 && (
                  <div className="p-4 bg-luxury-50 border border-luxury-200">
                    <p className="text-luxury-700">
                      <span className="font-medium">{nights} nights</span>
                      {discount && (
                        <span className="ml-2 text-gold-700">• {discount.label}</span>
                      )}
                    </p>
                  </div>
                )}

                {availability?.unavailablePeriods && availability.unavailablePeriods.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700 font-medium mb-2">Unavailable periods:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {availability.unavailablePeriods.map((period, i) => (
                        <li key={i}>{period.from} - {period.to}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Guests */}
            {step === 'guests' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl text-luxury-900 mb-6">Number of Guests</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-luxury-700 mb-2">
                      Adults
                    </label>
                    <select
                      className="input-field"
                      {...register('adultsCount', { required: true, min: 1 })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-luxury-700 mb-2">
                      Children
                    </label>
                    <select
                      className="input-field"
                      {...register('childrenCount')}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} child{n !== 1 ? 'ren' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-luxury-50 border border-luxury-200">
                  <p className="text-luxury-700">
                    Total: <span className="font-medium">{totalOccupants} guests</span>
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl text-luxury-900 mb-6">Review Your Request</h2>

                <div className="divide-y divide-luxury-200">
                  <div className="py-4 flex justify-between">
                    <span className="text-luxury-600">Check-in</span>
                    <span className="font-medium">{fromDate}</span>
                  </div>
                  <div className="py-4 flex justify-between">
                    <span className="text-luxury-600">Check-out</span>
                    <span className="font-medium">{toDate}</span>
                  </div>
                  <div className="py-4 flex justify-between">
                    <span className="text-luxury-600">Duration</span>
                    <span className="font-medium">{nights} nights</span>
                  </div>
                  <div className="py-4 flex justify-between">
                    <span className="text-luxury-600">Guests</span>
                    <span className="font-medium">
                      {adultsCount} adult{adultsCount > 1 ? 's' : ''}
                      {childrenCount > 0 && `, ${childrenCount} child${childrenCount > 1 ? 'ren' : ''}`}
                    </span>
                  </div>
                  {discount && (
                    <div className="py-4 flex justify-between text-gold-700">
                      <span>Discount</span>
                      <span className="font-medium">{discount.percent}%</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-luxury-100 border border-luxury-200">
                  <p className="text-sm text-luxury-600 mb-2">Note:</p>
                  <ul className="text-sm text-luxury-600 space-y-1">
                    <li>• Tourist tax will be calculated based on occupancy</li>
                    <li>• A mandatory household fee applies</li>
                    <li>• Final pricing will be confirmed in your quotation</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 'confirm' && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl text-luxury-900 mb-6">Confirm & Submit</h2>

                {!isAuthenticated && (
                  <div className="p-4 bg-gold-50 border border-gold-200">
                    <p className="text-gold-800 font-medium mb-2">Authentication Required</p>
                    <p className="text-gold-700 text-sm">
                      Please log in or create an account to submit your quotation request.
                    </p>
                  </div>
                )}

                <div className="p-6 bg-luxury-50 border border-luxury-200">
                  <h3 className="font-medium text-luxury-900 mb-4">Your Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-luxury-600">Dates:</span> {fromDate} to {toDate}</p>
                    <p><span className="text-luxury-600">Duration:</span> {nights} nights</p>
                    <p><span className="text-luxury-600">Guests:</span> {totalOccupants}</p>
                    {discount && (
                      <p className="text-gold-700">
                        <span className="text-luxury-600">Discount:</span> {discount.percent}%
                      </p>
                    )}
                  </div>
                </div>

                {quotationMutation.error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                    {quotationMutation.error instanceof Error
                      ? quotationMutation.error.message
                      : 'An error occurred. Please try again.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            {step !== 'dates' ? (
              <button type="button" onClick={prevStep} className="btn-secondary">
                Back
              </button>
            ) : (
              <div />
            )}

            {step !== 'confirm' ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={
                  (step === 'dates' && (!fromDate || !toDate || nights < 1)) ||
                  (step === 'guests' && adultsCount < 1)
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={quotationMutation.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quotationMutation.isPending
                  ? 'Submitting...'
                  : isAuthenticated
                  ? 'Submit Quotation Request'
                  : 'Log in to Submit'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
