'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const OUTCOMES = {
  release_to_team: 'Pay the team',
  return_to_team: 'Send back for rework',
  refund_client: 'Refund the client',
}

export default function RuleForm({ milestoneId, funded }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rule = async (outcome) => {
    if (!confirm(`${OUTCOMES[outcome]}? This is recorded and both sides can see it.`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/milestones/${milestoneId}/rule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (json.warning) alert(json.warning)
      router.refresh()
    } catch (err) {
      setError(err.message || 'Failed to record ruling')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
      <label className="input-label" htmlFor={`note-${milestoneId}`}>Reason for the ruling (both sides see this)</label>
      <textarea id={`note-${milestoneId}`} className="input textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} />
      {funded && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cl-text-secondary)', margin: '0.5rem 0' }}>
          “Refund the client” only records the ruling. Reverse the transfers and refund the payment in the Razorpay dashboard yourself.
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {Object.entries(OUTCOMES).map(([outcome, label]) => (
          <button key={outcome} type="button" className="btn btn--secondary btn--sm" disabled={busy || note.trim().length < 10} onClick={() => rule(outcome)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
