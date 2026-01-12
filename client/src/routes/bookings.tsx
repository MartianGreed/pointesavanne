import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const Route = createFileRoute('/bookings')({
  beforeLoad: () => {
    const user = localStorage.getItem('user')
    if (!user) {
      throw redirect({ to: '/login' })
    }
  },
  component: BookingsPage,
})

const statusLabels: Record<string, { label: string; color: string }> = {
  'quotation-requested': {
    label: 'Quotation Requested',
    color: 'bg-blue-100 text-blue-800',
  },
  'quotation-awaiting-acceptation': {
    label: 'Awaiting Signature',
    color: 'bg-yellow-100 text-yellow-800',
  },
  'quotation-signed': {
    label: 'Quotation Signed',
    color: 'bg-green-100 text-green-800',
  },
}

function BookingsPage() {
  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['bookings'],
    queryFn: api.getMyBookings,
  })

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="text-luxury-500">Loading your bookings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <div className="text-red-600">Error loading bookings. Please try again.</div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-72px)] py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="section-subheading mb-2">Your Reservations</p>
            <h1 className="section-heading text-3xl">My Bookings</h1>
          </div>
          <Link to="/book" className="btn-primary">
            New Booking
          </Link>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div className="bg-white p-12 text-center border border-luxury-200">
            <svg
              className="w-16 h-16 mx-auto mb-6 text-luxury-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="font-serif text-xl text-luxury-900 mb-2">No Bookings Yet</h3>
            <p className="text-luxury-500 mb-6">
              Start planning your luxury retreat at Pointe Savanne
            </p>
            <Link to="/book" className="btn-primary inline-block">
              Book Your Stay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = statusLabels[booking.status] || {
                label: booking.status,
                color: 'bg-gray-100 text-gray-800',
              }

              return (
                <Link
                  key={booking.id}
                  to="/bookings/$bookingId"
                  params={{ bookingId: booking.id }}
                  className="block bg-white p-6 border border-luxury-200 hover:border-luxury-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-serif text-lg text-luxury-900">
                          {booking.from} - {booking.to}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-luxury-600 text-sm">
                        {booking.pricing.nightsIn} nights •{' '}
                        {booking.adultsCount} adult{booking.adultsCount > 1 ? 's' : ''}
                        {booking.childrenCount > 0 &&
                          `, ${booking.childrenCount} child${booking.childrenCount > 1 ? 'ren' : ''}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-luxury-900">
                        {booking.pricing.totalAmount}
                      </p>
                      <p className="text-sm text-luxury-500">Total</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
