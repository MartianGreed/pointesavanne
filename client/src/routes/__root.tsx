import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-luxury-200">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl text-luxury-900 hover:text-luxury-700 transition-colors">
            Pointe Savanne
          </Link>

          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-sm tracking-wide text-luxury-600 hover:text-luxury-900 transition-colors [&.active]:text-luxury-900 [&.active]:font-medium"
            >
              Home
            </Link>
            <Link
              to="/book"
              className="text-sm tracking-wide text-luxury-600 hover:text-luxury-900 transition-colors [&.active]:text-luxury-900 [&.active]:font-medium"
            >
              Book Now
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/bookings"
                  className="text-sm tracking-wide text-luxury-600 hover:text-luxury-900 transition-colors [&.active]:text-luxury-900 [&.active]:font-medium"
                >
                  My Bookings
                </Link>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-luxury-500">
                    {user?.firstname}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm tracking-wide text-luxury-600 hover:text-luxury-900 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm tracking-wide text-luxury-600 hover:text-luxury-900 transition-colors [&.active]:text-luxury-900 [&.active]:font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-2 px-4"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1 pt-[72px]">
        <Outlet />
      </main>

      <footer className="bg-luxury-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-serif text-2xl mb-4">Pointe Savanne</h3>
              <p className="text-luxury-300 text-sm leading-relaxed">
                Experience unparalleled luxury in our exclusive villa retreat.
                Where elegance meets tranquility.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4 tracking-wide">Contact</h4>
              <address className="text-luxury-300 text-sm not-italic leading-relaxed">
                Pointe Savanne Villa<br />
                Mauritius<br />
                <a href="mailto:contact@pointesavanne.com" className="hover:text-white transition-colors">
                  contact@pointesavanne.com
                </a>
              </address>
            </div>
            <div>
              <h4 className="font-medium mb-4 tracking-wide">Quick Links</h4>
              <ul className="text-luxury-300 text-sm space-y-2">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">Home</Link>
                </li>
                <li>
                  <Link to="/book" className="hover:text-white transition-colors">Book Now</Link>
                </li>
                <li>
                  <a href="#availability" className="hover:text-white transition-colors">Availability</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-luxury-700 text-center text-luxury-400 text-sm">
            © {new Date().getFullYear()} Pointe Savanne. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
