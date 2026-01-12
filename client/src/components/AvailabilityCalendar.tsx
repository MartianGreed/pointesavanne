import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api/client'
import {
  format,
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

export function AvailabilityCalendar() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(null)
  const [selectedTo, setSelectedTo] = useState<Date | null>(null)

  const { data: bookedDates = [] } = useQuery({
    queryKey: ['bookedDates'],
    queryFn: api.getBookedDates,
    staleTime: 5 * 60 * 1000,
  })

  const bookedDatesSet = useMemo(() => {
    return new Set(bookedDates)
  }, [bookedDates])

  const isDateBooked = (date: Date): boolean => {
    return bookedDatesSet.has(format(date, 'dd/MM/yyyy'))
  }

  const isDateInRange = (date: Date): boolean => {
    if (!selectedFrom || !selectedTo) return false
    return isAfter(date, selectedFrom) && isBefore(date, selectedTo)
  }

  const handleDateClick = (date: Date) => {
    if (isDateBooked(date)) return
    if (isBefore(date, new Date())) return

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

  const handleProceed = () => {
    if (selectedFrom && selectedTo) {
      navigate({
        to: '/quote',
        search: {
          from: format(selectedFrom, 'dd/MM/yyyy'),
          to: format(selectedTo, 'dd/MM/yyyy'),
        },
      })
    }
  }

  const renderMonth = (monthDate: Date) => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-center font-serif text-xl mb-4">
          {format(monthDate, 'MMMM yyyy')}
        </h3>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 py-2">
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
            const isInRange = isDateInRange(day)

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
                  ${isInRange ? 'bg-luxury-gold/20' : ''}
                  ${!isBooked && !isPast && isCurrentMonth && !isStart && !isEnd && !isInRange ? 'hover:bg-luxury-champagne cursor-pointer' : ''}
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-luxury-gold rounded" />
            <span className="text-sm text-gray-600">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-100 rounded" />
            <span className="text-sm text-gray-600">Booked</span>
          </div>
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {renderMonth(currentMonth)}
        {renderMonth(addMonths(currentMonth, 1))}
      </div>

      {selectedFrom && selectedTo && (
        <div className="mt-8 text-center">
          <p className="text-lg mb-4">
            <span className="text-gray-600">Selected dates: </span>
            <span className="font-medium">
              {format(selectedFrom, 'dd MMMM yyyy')} — {format(selectedTo, 'dd MMMM yyyy')}
            </span>
          </p>
          <button onClick={handleProceed} className="btn-primary">
            Get Your Quote
          </button>
        </div>
      )}
    </div>
  )
}
