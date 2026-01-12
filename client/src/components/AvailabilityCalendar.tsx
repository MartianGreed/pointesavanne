import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  isToday,
} from 'date-fns'

interface AvailabilityCalendarProps {
  unavailablePeriods: Array<{ from: string; to: string }>
  pricingRanges: Array<{ from: string; to: string; pricePerWeek: string }>
}

export function AvailabilityCalendar({ unavailablePeriods, pricingRanges }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const isUnavailable = (date: Date) => {
    return unavailablePeriods.some((period) => {
      const from = parseISO(period.from)
      const to = parseISO(period.to)
      return isWithinInterval(date, { start: from, end: to })
    })
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className="bg-white p-6 border border-luxury-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-luxury-100 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-luxury-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-serif text-xl text-luxury-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-luxury-100 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-luxury-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-luxury-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const unavailable = isUnavailable(day)
          const isPast = isBefore(day, new Date()) && !isToday(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)

          return (
            <div
              key={day.toISOString()}
              className={`
                aspect-square p-1 text-center flex flex-col items-center justify-center text-sm
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${unavailable ? 'bg-red-100 text-red-400' : ''}
                ${isPast && !unavailable ? 'bg-luxury-100 text-luxury-400' : ''}
                ${isToday(day) ? 'ring-2 ring-gold-500' : ''}
                ${!unavailable && !isPast && isCurrentMonth ? 'bg-green-50 text-luxury-700' : ''}
              `}
            >
              <span className={`${isToday(day) ? 'font-bold' : ''}`}>
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-luxury-200 flex flex-wrap gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200" />
          <span className="text-sm text-luxury-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100" />
          <span className="text-sm text-luxury-600">Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-luxury-100" />
          <span className="text-sm text-luxury-600">Past</span>
        </div>
      </div>

      {/* Pricing Ranges */}
      {pricingRanges.length > 0 && (
        <div className="mt-6 pt-6 border-t border-luxury-200">
          <h4 className="font-medium text-luxury-900 mb-4">Seasonal Rates</h4>
          <div className="space-y-2">
            {pricingRanges.map((range, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-luxury-600">
                  {format(parseISO(range.from), 'dd MMM')} - {format(parseISO(range.to), 'dd MMM yyyy')}
                </span>
                <span className="font-medium text-luxury-900">{range.pricePerWeek}/week</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
