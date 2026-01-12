import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { data: availability } = useQuery({
    queryKey: ['availability'],
    queryFn: api.getAvailableDates,
  })

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-900/70 via-luxury-900/50 to-luxury-900/70" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop')`,
            zIndex: -1,
          }}
        />

        <div className="relative text-center text-white px-6 max-w-4xl">
          <p className="text-sm tracking-[0.3em] uppercase mb-6 text-gold-300">
            Exclusive Villa Rental
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-medium mb-6 leading-tight">
            Pointe Savanne
          </h1>
          <p className="text-xl md:text-2xl font-light mb-10 text-white/90">
            An exquisite sanctuary where luxury meets nature
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book" className="btn-primary bg-gold-600 hover:bg-gold-700 border-0">
              Book Your Stay
            </Link>
            <a href="#villa" className="btn-secondary border-white text-white hover:bg-white hover:text-luxury-900">
              Discover More
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Villa Section */}
      <section id="villa" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-subheading mb-4">Welcome to</p>
            <h2 className="section-heading">A Haven of Elegance</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-luxury-600 leading-relaxed mb-6">
                Nestled along the pristine coastline, Pointe Savanne offers an unparalleled
                escape into luxury living. Our villa combines contemporary design with
                timeless elegance, creating the perfect backdrop for your memorable retreat.
              </p>
              <p className="text-luxury-600 leading-relaxed mb-8">
                Every detail has been carefully curated to ensure your comfort and
                satisfaction. From the moment you arrive, you'll be enveloped in an
                atmosphere of refined tranquility.
              </p>

              <ul className="grid grid-cols-2 gap-4">
                {[
                  'Private Pool',
                  'Ocean View',
                  'Chef Kitchen',
                  '4 Bedrooms',
                  'Garden Terrace',
                  'Premium Amenities',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-luxury-700">
                    <svg className="w-5 h-5 text-gold-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=500&auto=format&fit=crop"
                alt="Villa exterior"
                className="rounded-lg shadow-lg"
              />
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=500&auto=format&fit=crop"
                alt="Villa interior"
                className="rounded-lg shadow-lg mt-8"
              />
              <img
                src="https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=500&auto=format&fit=crop"
                alt="Pool area"
                className="rounded-lg shadow-lg"
              />
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop"
                alt="Living space"
                className="rounded-lg shadow-lg mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Availability Section */}
      <section id="availability" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-subheading mb-4">Plan Your Escape</p>
            <h2 className="section-heading">Availability & Rates</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <AvailabilityCalendar
              unavailablePeriods={availability?.unavailablePeriods || []}
              pricingRanges={availability?.pricingRanges || []}
            />
          </div>

          <div className="text-center mt-12">
            <Link to="/book" className="btn-primary">
              Request a Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Info */}
      <section className="py-24 px-6 bg-luxury-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-subheading mb-4">Value & Quality</p>
            <h2 className="section-heading">Transparent Pricing</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-luxury-100 rounded-full">
                <svg className="w-8 h-8 text-luxury-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a4 4 0 00-4-4H5.45a4 4 0 00-3.743 2.586l-.082.227a1 1 0 00.072.885l3.527 5.291A2 2 0 007 12h2M12 6a4 4 0 014-4h2.55a4 4 0 013.743 2.586l.082.227a1 1 0 01-.072.885l-3.527 5.291A2 2 0 0117 12h-2" />
                </svg>
              </div>
              <h3 className="font-serif text-xl mb-3">8-14 Nights</h3>
              <p className="text-gold-700 font-medium text-lg mb-2">10% Discount</p>
              <p className="text-luxury-500 text-sm">Extended stays are rewarded</p>
            </div>

            <div className="bg-white p-8 text-center border-2 border-gold-500">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-gold-100 rounded-full">
                <svg className="w-8 h-8 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl mb-3">15+ Nights</h3>
              <p className="text-gold-700 font-medium text-lg mb-2">15% Discount</p>
              <p className="text-luxury-500 text-sm">Best value for longer stays</p>
            </div>

            <div className="bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-luxury-100 rounded-full">
                <svg className="w-8 h-8 text-luxury-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-serif text-xl mb-3">All Inclusive</h3>
              <p className="text-luxury-700 font-medium text-lg mb-2">Household Fee</p>
              <p className="text-luxury-500 text-sm">Cleaning & final service included</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-luxury-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-6">
            Ready to Experience Luxury?
          </h2>
          <p className="text-luxury-300 text-lg mb-10 max-w-2xl mx-auto">
            Begin your journey to an unforgettable retreat. Request a personalized
            quotation and we'll craft the perfect stay for you.
          </p>
          <Link to="/book" className="btn-primary bg-gold-600 hover:bg-gold-700 text-lg px-12 py-5">
            Request Your Quotation
          </Link>
        </div>
      </section>
    </div>
  )
}
