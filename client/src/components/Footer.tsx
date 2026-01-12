import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="bg-luxury-charcoal text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <h3 className="font-serif text-2xl tracking-widest mb-6">POINTE SAVANNE</h3>
            <p className="text-white/70 leading-relaxed">
              Experience unparalleled luxury at our beachfront retreat.
              Where the ocean meets serenity.
            </p>
          </div>
          <div>
            <h4 className="text-sm tracking-wider mb-6 text-luxury-gold">QUICK LINKS</h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <a href="#villa" className="hover:text-white transition-colors">The Villa</a>
              </li>
              <li>
                <a href="#availability" className="hover:text-white transition-colors">Availability</a>
              </li>
              <li>
                <Link to="/quote" className="hover:text-white transition-colors">Request a Quote</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm tracking-wider mb-6 text-luxury-gold">CONTACT</h4>
            <ul className="space-y-3 text-white/70">
              <li>Pointe Savanne, Mauritius</li>
              <li>contact@pointesavanne.com</li>
              <li>+230 123 4567</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/50 text-sm">
          <p>&copy; {new Date().getFullYear()} Villa Pointe Savanne. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
