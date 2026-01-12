import { useState, useMemo } from 'react'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Users, Calendar, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import type { QuotationRequest, CustomerProfile } from '../types/booking'
import {
  format,
  parse,
  differenceInDays,
  isValid,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  startOfWeek,
  endOfWeek,
} from 'date-fns'

interface QuoteSearchParams {
  from?: string
  to?: string
  adults?: number
  children?: number
}

const routeApi = getRouteApi('/quote')

type Step = 'dates' | 'guests' | 'details' | 'review'

export function QuotationPage() {
  const navigate = useNavigate()
  const search = routeApi.useSearch() as QuoteSearchParams

  const [step, setStep] = useState<Step>('dates')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null
    const parsed = parse(dateStr, 'dd/MM/yyyy', new Date())
    return isValid(parsed) ? parsed : null
  }

  const [selectedFrom, setSelectedFrom] = useState<Date | null>(parseDate(search.from))
  const [selectedTo, setSelectedTo] = useState<Date | null>(parseDate(search.to))
  const [adults, setAdults] = useState(search.adults || 2)
  const [children, setChildren] = useState(search.children || 0)

  const [profile, setProfile] = useState<CustomerProfile>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      line3: '',
    },
  })

  const { data: bookedDates = [] } = useQuery({
    queryKey: ['bookedDates'],
    queryFn: api.getBookedDates,
  })

  const bookedDatesSet = useMemo(() => new Set(bookedDates), [bookedDates])

  const isDateBooked = (date: Date): boolean => bookedDatesSet.has(format(date, 'dd/MM/yyyy'))

  const isDateInRange = (date: Date): boolean => {
    if (!selectedFrom || !selectedTo) return false
    return isAfter(date, selectedFrom) && isBefore(date, selectedTo)
  }

  const handleDateClick = (date: Date) => {
    if (isDateBooked(date) || isBefore(date, new Date())) return

    if (!selectedFrom || (selectedFrom && selectedTo)) {
      setSelectedFrom(date)
      setSelectedTo(null)
    } else {
      if (isBefore(date, selectedFrom)) {
        setSelectedTo(selectedFrom)
        setSelectedFrom(date)
      } else {
        setSelectedTo(date)
      }
    }
  }

  const nightsCount = useMemo(() => {
    if (!selectedFrom || !selectedTo) return 0
    return differenceInDays(selectedTo, selectedFrom)
  }, [selectedFrom, selectedTo])

  const quotationMutation = useMutation({
    mutationFn: (request: QuotationRequest) => api.requestQuotation(request),
    onSuccess: (data) => {
      navigate({ to: '/booking/$id', params: { id: data.id } })
    },
  })

  const handleSubmit = () => {
    if (!selectedFrom || !selectedTo) return

    const request: QuotationRequest = {
      villa: 'Pointe Savanne',
      from: format(selectedFrom, 'dd/MM/yyyy'),
      to: format(selectedTo, 'dd/MM/yyyy'),
      adultsCount: adults,
      childrenCount: children,
      customer: profile,
    }

    quotationMutation.mutate(request)
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 'dates':
        return !!selectedFrom && !!selectedTo && nightsCount >= 7
      case 'guests':
        return adults >= 1 && adults + children <= 8
      case 'details':
        return (
          profile.firstName.length > 0 &&
          profile.lastName.length > 0 &&
          profile.email.length > 0 &&
          profile.phone.length > 0
        )
      case 'review':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    const steps: Step[] = ['dates', 'guests', 'details', 'review']
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: Step[] = ['dates', 'guests', 'details', 'review']
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  const renderMonth = (monthDate: Date) => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return (
      <div className="bg-white p-4 rounded-lg">
        <h3 className="text-center font-serif text-lg mb-4">
          {format(monthDate, 'MMMM yyyy')}
        </h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isBooked = isDateBooked(day)
            const isPast = isBefore(day, new Date())
            const isCurrentMonth = isSameMonth(day, monthDate)
            const isStart = selectedFrom && isSameDay(day, selectedFrom)
            const isEnd = selectedTo && isSameDay(day, selectedTo)
            const inRange = isDateInRange(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                disabled={isBooked || isPast || !isCurrentMonth}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded transition-all
                  ${!isCurrentMonth ? 'text-gray-300' : ''}
                  ${isPast && isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${isBooked && isCurrentMonth ? 'bg-red-100 text-red-400 cursor-not-allowed' : ''}
                  ${isStart || isEnd ? 'bg-luxury-gold text-white' : ''}
                  ${inRange ? 'bg-luxury-gold/20' : ''}
                  ${!isBooked && !isPast && isCurrentMonth && !isStart && !isEnd && !inRange ? 'hover:bg-luxury-champagne cursor-pointer' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {['dates', 'guests', 'details', 'review'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-luxury-gold text-white'
                      : ['dates', 'guests', 'details', 'review'].indexOf(step) > idx
                      ? 'bg-luxury-gold/20 text-luxury-gold'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 3 && (
                  <div
                    className={`w-12 h-0.5 ${
                      ['dates', 'guests', 'details', 'review'].indexOf(step) > idx
                        ? 'bg-luxury-gold/40'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-md mx-auto mt-2 text-xs text-gray-500">
            <span>Dates</span>
            <span>Guests</span>
            <span>Details</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {step === 'dates' && (
            <>
              <h2 className="section-heading text-3xl mb-2">Select Your Dates</h2>
              <p className="text-gray-600 mb-8">Minimum stay is 7 nights</p>

              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {renderMonth(currentMonth)}
                {renderMonth(addMonths(currentMonth, 1))}
              </div>

              {selectedFrom && selectedTo && (
                <div className="text-center p-4 bg-luxury-cream/30 rounded-lg">
                  <p className="text-lg">
                    <span className="font-medium">{format(selectedFrom, 'dd MMM yyyy')}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-medium">{format(selectedTo, 'dd MMM yyyy')}</span>
                  </p>
                  <p className="text-gray-600 mt-1">{nightsCount} nights</p>
                  {nightsCount < 7 && (
                    <p className="text-red-500 text-sm mt-2">Minimum stay is 7 nights</p>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'guests' && (
            <>
              <h2 className="section-heading text-3xl mb-2">Number of Guests</h2>
              <p className="text-gray-600 mb-8">Maximum 8 guests total</p>

              <div className="space-y-6 max-w-sm mx-auto">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-luxury-gold" />
                    <div>
                      <p className="font-medium">Adults</p>
                      <p className="text-sm text-gray-500">Age 13+</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-8 h-8 rounded-full border hover:bg-gray-50 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{adults}</span>
                    <button
                      onClick={() => setAdults(Math.min(8 - children, adults + 1))}
                      className="w-8 h-8 rounded-full border hover:bg-gray-50 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-luxury-gold" />
                    <div>
                      <p className="font-medium">Children</p>
                      <p className="text-sm text-gray-500">Age 0-12</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="w-8 h-8 rounded-full border hover:bg-gray-50 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{children}</span>
                    <button
                      onClick={() => setChildren(Math.min(8 - adults, children + 1))}
                      className="w-8 h-8 rounded-full border hover:bg-gray-50 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-center p-4 bg-luxury-cream/30 rounded-lg">
                  <p className="text-lg">
                    <span className="font-medium">{adults + children}</span> guests total
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 'details' && (
            <>
              <h2 className="section-heading text-3xl mb-2">Your Details</h2>
              <p className="text-gray-600 mb-8">We&apos;ll use this to prepare your quotation</p>

              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="input-field"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="input-field"
                    placeholder="Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input-field"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="input-field"
                    placeholder="+230 123 4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Address Line 1</label>
                  <input
                    type="text"
                    value={profile.address?.line1 || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, line1: e.target.value },
                      })
                    }
                    className="input-field"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={profile.address?.line2 || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, line2: e.target.value },
                      })
                    }
                    className="input-field"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input
                    type="text"
                    value={profile.address?.line3 || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        address: { ...profile.address, line3: e.target.value },
                      })
                    }
                    className="input-field"
                    placeholder="Country"
                  />
                </div>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <h2 className="section-heading text-3xl mb-2">Review Your Request</h2>
              <p className="text-gray-600 mb-8">Please confirm your details before submitting</p>

              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="p-6 bg-luxury-cream/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-luxury-gold" />
                    <h3 className="font-serif text-lg">Stay Details</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Check-in</p>
                      <p className="font-medium">{selectedFrom && format(selectedFrom, 'dd MMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-out</p>
                      <p className="font-medium">{selectedTo && format(selectedTo, 'dd MMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium">{nightsCount} nights</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-luxury-cream/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-luxury-gold" />
                    <h3 className="font-serif text-lg">Guests</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Adults</p>
                      <p className="font-medium">{adults}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Children</p>
                      <p className="font-medium">{children}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-luxury-cream/30 rounded-lg">
                  <h3 className="font-serif text-lg mb-4">Contact Details</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Name</p>
                      <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{profile.phone}</p>
                    </div>
                    {profile.address?.line1 && (
                      <div>
                        <p className="text-gray-500">Address</p>
                        <p className="font-medium">
                          {profile.address.line1}
                          {profile.address.line2 && `, ${profile.address.line2}`}
                          {profile.address.line3 && `, ${profile.address.line3}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {quotationMutation.error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    {quotationMutation.error.message}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step !== 'dates' ? (
            <button onClick={prevStep} className="btn-secondary">
              Back
            </button>
          ) : (
            <div />
          )}

          {step !== 'review' ? (
            <button onClick={nextStep} disabled={!canProceed()} className="btn-primary disabled:opacity-50">
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={quotationMutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {quotationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request Quote'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
