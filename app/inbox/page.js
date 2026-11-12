'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/Icon/Icon'

const FOCUS_LABELS = {
  web_development: 'Web Dev', mobile_development: 'Mobile',
  design: 'Design', content: 'Content', data_science: 'Data & AI',
  devops: 'DevOps', fullstack: 'Full-Stack', other: 'Other',
}

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function InboxPage() {
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    fetch('/api/invites')
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        setInvites(json.data || [])
      })
      .catch(() => setError('Failed to load inbox'))
      .finally(() => setLoading(false))
  }, [])

  const respond = async (id, action) => {
    setBusyId(id)
    setError('')
    try {
      const res = await fetch(`/api/invites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setInvites(prev => prev.map(i => i.id === id ? { ...i, status: json.data.status, responded_at: json.data.responded_at } : i))
    } catch (err) {
      setError(err.message || 'Failed to respond to invite')
    } finally {
      setBusyId(null)
    }
  }

  const pending = invites.filter(i => i.status === 'pending')
  const responded = invites.filter(i => i.status !== 'pending')

  return (
    <div className="container" style={{ padding: 'var(--space-xl) 0', maxWidth: 720 }}>
      <h1 style={{ marginBottom: 'var(--space-xs)' }}>Inbox</h1>
      <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-xl)' }}>
        Team invites sent to you.
      </p>

      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      ) : invites.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-sm)', color: 'var(--cl-text-tertiary)' }}><Icon name="inbox" size={40} /></div>
          <p style={{ color: 'var(--cl-text-secondary)' }}>No invites yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              {pending.map((invite) => (
                <div key={invite.id} className="card" style={{ padding: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                  <div className="avatar avatar--sm">{invite.collectives?.avatar_initial || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      <Link href={`/teams/${invite.collectives?.id}`}>{invite.collectives?.name || 'A team'}</Link> invited you to join
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--cl-text-secondary)' }}>
                      {FOCUS_LABELS[invite.collectives?.focus_area] || ''} · {relativeTime(invite.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn--primary btn--sm" disabled={busyId === invite.id} onClick={() => respond(invite.id, 'accept')} id={`accept-invite-${invite.id}`}>
                      Accept
                    </button>
                    <button className="btn btn--ghost btn--sm" disabled={busyId === invite.id} onClick={() => respond(invite.id, 'decline')} id={`decline-invite-${invite.id}`}>
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {responded.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)', color: 'var(--cl-text-secondary)' }}>Earlier</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {responded.map((invite) => (
                  <div key={invite.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', opacity: 0.7 }}>
                    <div className="avatar avatar--sm">{invite.collectives?.avatar_initial || '?'}</div>
                    <div style={{ flex: 1, fontSize: '0.875rem' }}>
                      {invite.collectives?.name || 'A team'} — you {invite.status} this invite
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
