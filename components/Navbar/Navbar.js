'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import './Navbar.css'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [lastPathname, setLastPathname] = useState(null)
  const pathname = usePathname()
  const router = useRouter()

  // Close the mobile menu on navigation (adjusting state during render
  // avoids the extra render pass a setState-in-effect would cause)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/')

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        <Link href="/" className="navbar__logo" id="nav-logo">
          <span className="navbar__logo-icon">⬡</span>
          <span className="navbar__logo-text">
            Collab<span className="navbar__logo-accent">Lance</span>
          </span>
        </Link>

        <nav className={`navbar__nav ${menuOpen ? 'navbar__nav--open' : ''}`} id="main-nav">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`navbar__link ${isActive('/dashboard') ? 'navbar__link--active' : ''}`}
                id="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link
                href="/collectives"
                className={`navbar__link ${isActive('/collectives') ? 'navbar__link--active' : ''}`}
                id="nav-collectives"
              >
                Collectives
              </Link>
              <Link
                href="/projects"
                className={`navbar__link ${isActive('/projects') ? 'navbar__link--active' : ''}`}
                id="nav-projects"
              >
                Projects
              </Link>
              <Link
                href="/chat"
                className={`navbar__link ${isActive('/chat') ? 'navbar__link--active' : ''}`}
                id="nav-chat"
              >
                Chat
              </Link>
              <Link
                href="/context"
                className={`navbar__link navbar__link--context ${isActive('/context') ? 'navbar__link--active' : ''}`}
                id="nav-context"
              >
                🧠 Context
              </Link>
              <div className="navbar__actions">
                <Link href="/profile" className="navbar__avatar" id="nav-profile">
                  <span className="avatar avatar--sm">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </Link>
                <button onClick={handleLogout} className="btn btn--ghost btn--sm" id="nav-logout">
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/#features" className="navbar__link" id="nav-features">
                Features
              </Link>
              <Link href="/#how-it-works" className="navbar__link" id="nav-how">
                How it Works
              </Link>
              <div className="navbar__actions">
                <Link href="/auth/login" className="btn btn--ghost btn--sm" id="nav-login">
                  Log in
                </Link>
                <Link href="/auth/signup" className="btn btn--primary btn--sm" id="nav-signup">
                  Get Started
                </Link>
              </div>
            </>
          )}
        </nav>

        <button
          className="navbar__burger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          id="nav-burger"
        >
          <span className={`navbar__burger-line ${menuOpen ? 'navbar__burger-line--open' : ''}`} />
          <span className={`navbar__burger-line ${menuOpen ? 'navbar__burger-line--open' : ''}`} />
          <span className={`navbar__burger-line ${menuOpen ? 'navbar__burger-line--open' : ''}`} />
        </button>
      </div>
    </header>
  )
}
