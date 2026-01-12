import { Link } from '@tanstack/react-router'
import { Calendar, Users, Waves, Sun, Utensils, Car } from 'lucide-react'
import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import { PricingSection } from '../components/PricingSection'

export function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=2000&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </div>

        <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto">
          <p className="text-sm tracking-[0.3em] mb-6 text-luxury-champagne">MAURITIUS LUXURY RETREAT</p>
          <h1 className="text-5xl md:text-7xl font-serif font-medium mb-6 text-shadow leading-tight">
            Villa Pointe Savanne
          </h1>
          <p className="text-xl md:text-2xl font-light mb-10 text-white/90">
            An exclusive beachfront sanctuary where timeless elegance meets tropical paradise
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/quote" className="btn-primary min-w-[200px]">
              Request a Quote
            </Link>
            <a href="#villa" className="btn-secondary border-white text-white hover:bg-white hover:text-luxury-charcoal min-w-[200px]">
              Discover More
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Villa Introduction */}
      <section id="villa" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-luxury-gold text-sm tracking-[0.2em] mb-4">THE EXPERIENCE</p>
              <h2 className="section-heading mb-6">
                A Haven of Tranquility
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Nestled along the pristine shores of Mauritius, Villa Pointe Savanne offers
                an unparalleled escape from the ordinary. Our meticulously designed retreat
                combines contemporary luxury with natural beauty, creating the perfect setting
                for your most cherished moments.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                Wake up to breathtaking ocean views, spend your days exploring crystal-clear
                waters, and unwind in spaces designed for ultimate comfort. This is more than
                a vacation — it&apos;s an experience you&apos;ll treasure forever.
              </p>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-4xl font-serif text-luxury-gold">4</p>
                  <p className="text-sm text-gray-500 mt-1">Bedrooms</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-serif text-luxury-gold">8</p>
                  <p className="text-sm text-gray-500 mt-1">Guests</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-serif text-luxury-gold">350</p>
                  <p className="text-sm text-gray-500 mt-1">m² Living</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=1000&q=80"
                alt="Villa Interior"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-luxury-gold/20 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section id="amenities" className="py-24 bg-luxury-cream/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-luxury-gold text-sm tracking-[0.2em] mb-4">WHAT WE OFFER</p>
            <h2 className="section-heading">Exceptional Amenities</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Waves, title: 'Private Beach Access', desc: 'Step directly onto pristine white sands' },
              { icon: Sun, title: 'Infinity Pool', desc: 'Stunning ocean views from our heated pool' },
              { icon: Utensils, title: 'Gourmet Kitchen', desc: 'Fully equipped for culinary adventures' },
              { icon: Users, title: 'Concierge Service', desc: '24/7 personalized assistance' },
              { icon: Calendar, title: 'Flexible Booking', desc: 'Weekly stays with seasonal rates' },
              { icon: Car, title: 'Airport Transfer', desc: 'Complimentary luxury transport' },
            ].map((amenity, idx) => (
              <div
                key={idx}
                className="bg-white p-8 text-center hover:shadow-lg transition-shadow"
              >
                <amenity.icon className="w-10 h-10 text-luxury-gold mx-auto mb-4" />
                <h3 className="font-serif text-xl mb-2">{amenity.title}</h3>
                <p className="text-gray-600">{amenity.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Availability Calendar */}
      <section id="availability" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-luxury-gold text-sm tracking-[0.2em] mb-4">PLAN YOUR STAY</p>
            <h2 className="section-heading mb-4">Check Availability</h2>
            <p className="section-subheading max-w-2xl mx-auto">
              Select your dates and begin your journey to paradise
            </p>
          </div>
          <AvailabilityCalendar />
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* CTA Section */}
      <section className="py-24 bg-luxury-charcoal text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-serif mb-6">
            Ready for Paradise?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Begin your journey to an unforgettable escape. Request your personalized
            quotation today and let us craft your perfect getaway.
          </p>
          <Link to="/quote" className="btn-primary bg-luxury-gold hover:bg-white hover:text-luxury-charcoal">
            Request Your Quote
          </Link>
        </div>
      </section>
    </>
  )
}
