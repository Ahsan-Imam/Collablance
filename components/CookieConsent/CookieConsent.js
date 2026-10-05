'use client'

import { useState, useEffect } from 'react'
import './CookieConsent.css'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cl_cookie_consent')
    if (!consent) {
      // Small delay so banner doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = (level) => {
    const record = {
      level, // 'all' or 'essential'
      timestamp: new Date().toISOString(),
      version: '1.0',
    }
    localStorage.setItem('cl_cookie_consent', JSON.stringify(record))
    setVisible(false)

    // Dispatch event so analytics can initialize if needed
    if (level === 'all') {
      window.dispatchEvent(new CustomEvent('cookie-consent-granted', { detail: record }))
    }
  }

  if (!visible) return null

  return (
    <div className="cookie-banner animate-fade-in-up" role="dialog" aria-label="Cookie consent" id="cookie-consent-banner">
      <div className="cookie-banner__content">
        <div className="cookie-banner__icon">🍪</div>
        <div className="cookie-banner__text">
          <p className="cookie-banner__title">We value your privacy</p>
          <p className="cookie-banner__desc">
            We use essential cookies for authentication and platform operation. 
            Analytics cookies help us improve CollabLance — we use privacy-friendly 
            analytics only. No advertising or tracking cookies ever.{' '}
            <a href="/legal/cookies" className="cookie-banner__link">Learn more</a>
          </p>
        </div>
      </div>
      <div className="cookie-banner__actions">
        {/* Both options equally visible — no dark patterns per guardrails */}
        <button
          onClick={() => handleAccept('essential')}
          className="btn btn--secondary btn--sm"
          id="cookie-essential-only"
        >
          Essential Only
        </button>
        <button
          onClick={() => handleAccept('all')}
          className="btn btn--primary btn--sm"
          id="cookie-accept-all"
        >
          Accept All
        </button>
      </div>
    </div>
  )
}
