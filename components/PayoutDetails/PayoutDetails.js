'use client'

import { useEffect, useState } from 'react'

// Freelancer payout setup. Details go to Razorpay (via /api/payout-account),
// which creates a payout account in the freelancer's name; CollabLance never
// stores the bank details.
export default function PayoutDetails() {
  const [status, setStatus] = useState(null) // { hasPayoutAccount, paymentsEnabled }
  const [form, setForm] = useState({ legal_name: '', phone: '', account_number: '', ifsc: '', tnc_accepted: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/payout-account')
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok || !json.data) throw new Error(json.error || `HTTP ${r.status}`)
        setStatus(json.data)
      })
      .catch((err) => setStatus({ loadError: err.message }))
  }, [])

  if (status?.loadError) {
    return (
      <div className="card" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-sm)' }}>Payout details</h2>
        <p style={{ color: 'var(--cl-danger, #dc2626)', fontSize: '0.875rem' }}>Couldn&apos;t load payout settings: {status.loadError}</p>
      </div>
    )
  }
  if (!status?.paymentsEnabled) return null

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/payout-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setStatus(s => ({ ...s, hasPayoutAccount: true }))
      setForm({ legal_name: '', phone: '', account_number: '', ifsc: '', tnc_accepted: false })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }} id="payout-details">
      <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-sm)' }}>Payout details</h2>
      {status.hasPayoutAccount ? (
        <p style={{ color: 'var(--cl-text-secondary)' }}>
          Set up. Your share of each approved milestone is paid to your bank account by Razorpay.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem' }}>
            Needed before a client can fund your team&apos;s milestones. Sent securely to Razorpay — CollabLance doesn&apos;t store your bank details.
          </p>
          <label className="input-label" htmlFor="payout-name">Full name (as on bank account)</label>
          <input id="payout-name" className="input" value={form.legal_name} onChange={set('legal_name')} required autoComplete="name" />
          <label className="input-label" htmlFor="payout-phone">Phone</label>
          <input id="payout-phone" className="input" value={form.phone} onChange={set('phone')} required inputMode="tel" autoComplete="tel" />
          <label className="input-label" htmlFor="payout-account">Bank account number</label>
          <input id="payout-account" className="input" value={form.account_number} onChange={set('account_number')} required inputMode="numeric" autoComplete="off" />
          <label className="input-label" htmlFor="payout-ifsc">IFSC code</label>
          <input id="payout-ifsc" className="input" value={form.ifsc} onChange={set('ifsc')} required placeholder="HDFC0001234" autoComplete="off" />
          <label style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-start', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.tnc_accepted} onChange={set('tnc_accepted')} required />
            <span>I agree to Razorpay creating a payout account in my name and to CollabLance&apos;s <a href="/legal/terms">Terms</a> (8% team commission on each milestone).</span>
          </label>
          {error && <p style={{ color: 'var(--cl-danger, #dc2626)', fontSize: '0.875rem' }}>{error}</p>}
          <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Setting up…' : 'Set up payouts'}</button>
        </form>
      )}
    </div>
  )
}
