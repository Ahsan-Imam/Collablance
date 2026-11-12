'use client'

import { useEffect } from 'react'

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

// Plausible (privacy-friendly, per guardrail.md). Loads only after the visitor
// chose "Accept All" in the cookie banner, and only if a domain is configured.
export default function Analytics() {
  useEffect(() => {
    if (!DOMAIN) return
    const load = () => {
      if (document.getElementById('plausible-script')) return
      let level = null
      try { level = JSON.parse(localStorage.getItem('cl_cookie_consent'))?.level } catch {}
      if (level !== 'all') return
      const script = document.createElement('script')
      script.id = 'plausible-script'
      script.defer = true
      script.dataset.domain = DOMAIN
      script.src = 'https://plausible.io/js/script.js'
      document.head.appendChild(script)
    }
    load()
    window.addEventListener('cookie-consent-granted', load)
    return () => window.removeEventListener('cookie-consent-granted', load)
  }, [])
  return null
}
