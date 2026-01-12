import { Link, useRouterState } from '@tanstack/react-router'

export function Header() {
  const routerState = useRouterState()
  const isLandingPage = routerState.location.pathname === '/'

  const headerClasses = isLandingPage
    ? 'absolute top-0 left-0 right-0 z-50'
    : 'fixed top-0 left-0 right-0 z-50 bg-luxury-charcoal shadow-md'

  const logoClasses = isLandingPage
    ? 'text-white font-serif text-2xl tracking-widest'
    : 'text-white font-serif text-2xl tracking-widest'

  const linkClasses = isLandingPage
    ? 'text-white/90 hover:text-white text-sm tracking-wider transition-colors'
    : 'text-white/80 hover:text-white text-sm tracking-wider transition-colors'

  const buttonClasses = isLandingPage
    ? 'px-6 py-2 border border-white/50 text-white text-sm tracking-wider hover:bg-white hover:text-luxury-charcoal transition-all'
    : 'px-6 py-2 bg-luxury-gold text-white text-sm tracking-wider hover:bg-white hover:text-luxury-charcoal transition-all'

  return (
    <header className={headerClasses}>
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className={logoClasses}>
            POINTE SAVANNE
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            {isLandingPage ? (
              <>
                <a href="#villa" className={linkClasses}>
                  THE VILLA
                </a>
                <a href="#availability" className={linkClasses}>
                  AVAILABILITY
                </a>
                <a href="#amenities" className={linkClasses}>
                  AMENITIES
                </a>
              </>
            ) : (
              <Link to="/" className={linkClasses}>
                BACK TO HOME
              </Link>
            )}
            <Link to="/quote" className={buttonClasses}>
              BOOK NOW
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}
