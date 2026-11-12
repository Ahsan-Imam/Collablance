'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addRole, switchRole, ROLE_CHANGED_EVENT, ROLE_HOME } from '@/lib/roles'
import './Navbar.css'

export default function Navbar() {
  const [user, setUser] = useState(null)
  // role = active mode; roles = which ones the account has
  const [role, setRole] = useState(null)
  const [roles, setRoles] = useState({ client: false, freelancer: false })
  const [switching, setSwitching] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [lastPathname, setLastPathname] = useState(null)
  const [pendingInvites, setPendingInvites] = useState(0)
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

  // Look up roles whenever the signed-in user changes, or a role is added/switched
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const load = () => createClient()
      .from('profiles')
      .select('role, is_client, is_freelancer')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setRole(data?.role || 'freelancer')
        setRoles({ client: !!data?.is_client, freelancer: data ? !!data.is_freelancer : true })
      })
    load()
    window.addEventListener(ROLE_CHANGED_EVENT, load)
    return () => window.removeEventListener(ROLE_CHANGED_EVENT, load)
  }, [userId])

  // Pending invite count for the inbox badge — refetch when navigating,
  // so responding to an invite clears it.
  useEffect(() => {
    if (!userId) return
    fetch('/api/invites')
      .then(r => r.json())
      .then(json => setPendingInvites((json.data || []).filter(i => i.status === 'pending').length))
      .catch(() => {})
  }, [userId, pathname])

  // The other mode: switch to it if the account has it, otherwise add it
  const otherRole = role === 'client' ? 'freelancer' : 'client'
  const hasOtherRole = roles[otherRole]

  const handleRoleToggle = async () => {
    setSwitching(true)
    try {
      await (hasOtherRole ? switchRole(otherRole) : addRole(otherRole))
      router.push(ROLE_HOME[otherRole])
    } catch (err) {
      console.error('Role change failed:', err.message)
    } finally {
      setSwitching(false)
    }
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    if (!confirm('Log out of CollabLance?')) return
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
              {role === 'client' ? (
                <Link
                  href="/client"
                  className={`navbar__link ${isActive('/client') ? 'navbar__link--active' : ''}`}
                  id="nav-client"
                >
                  Client Hub
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className={`navbar__link ${isActive('/dashboard') ? 'navbar__link--active' : ''}`}
                  id="nav-dashboard"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/teams"
                className={`navbar__link ${isActive('/teams') ? 'navbar__link--active' : ''}`}
                id="nav-teams"
              >
                {role === 'client' ? 'Find Teams' : 'Teams'}
              </Link>
              <Link
                href="/projects"
                className={`navbar__link ${isActive('/projects') ? 'navbar__link--active' : ''}`}
                id="nav-projects"
              >
                Projects
              </Link>
              <Link
                href="/inbox"
                className={`navbar__link ${isActive('/inbox') ? 'navbar__link--active' : ''}`}
                id="nav-inbox"
                style={{ position: 'relative' }}
              >
                📬 Inbox
                {pendingInvites > 0 && (
                  <span className="navbar__badge" id="nav-inbox-badge">{pendingInvites}</span>
                )}
              </Link>
              <div className="navbar__actions">
                {role && (
                  <button
                    onClick={handleRoleToggle}
                    className="btn btn--secondary btn--sm navbar__role-toggle"
                    disabled={switching}
                    id="nav-role-toggle"
                    title={hasOtherRole
                      ? `You're in ${role} mode`
                      : `Use the same account as a ${otherRole} too`}
                  >
                    {switching
                      ? 'Switching...'
                      : hasOtherRole
                        ? `Switch to ${otherRole === 'client' ? 'Client' : 'Freelancer'}`
                        : `Become a ${otherRole}`}
                  </button>
                )}
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
              <Link href="/hire" className={`navbar__link ${isActive('/hire') ? 'navbar__link--active' : ''}`} id="nav-hire">
                Browse Teams
              </Link>
              <Link href="/pricing" className={`navbar__link ${isActive('/pricing') ? 'navbar__link--active' : ''}`} id="nav-pricing">
                Pricing
              </Link>
              <Link href="/#how-it-works" className="navbar__link" id="nav-how">
                How it Works
              </Link>
              <Link
                href="/for-freelancers"
                className={`navbar__link ${isActive('/for-freelancers') ? 'navbar__link--active' : ''}`}
                id="nav-for-freelancers"
              >
                For Freelancers
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
