'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ActionButton({ url, label, confirmText }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!confirm(confirmText)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={run}>{label}</button>
      {error && <span role="alert" style={{ color: 'var(--cl-error)', fontSize: '0.8125rem' }}>{error}</span>}
    </>
  )
}
