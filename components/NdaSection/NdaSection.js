'use client'

import { useState, useEffect } from 'react'

// Non-disclosure agreement for a project: the client asks for one, then the
// client and every team member sign the same fixed text.
export default function NdaSection({ projectId, userId, isOwner }) {
  const [nda, setNda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${projectId}/nda`)
      .then(r => r.json())
      .then(json => setNda(json.data || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  const act = async (action) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/nda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setNda(json.data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (loading || (!nda && !isOwner)) return null
  const mine = nda?.signers.find(s => s.user_id === userId)

  return (
    <div className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }} id="nda-section">
      <h2 className="project-detail__section-title" style={{ marginBottom: 'var(--space-sm)' }}>Non-Disclosure Agreement</h2>
      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {!nda ? (
        <>
          <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
            Optional. Ask the team to sign a standard NDA before you share sensitive details. It is a template, not legal advice, and it can&apos;t be edited or removed once created.
          </p>
          <button className="btn btn--secondary btn--sm" onClick={() => act('create')} disabled={busy}>
            {busy ? 'Creating…' : 'Create NDA for this project'}
          </button>
        </>
      ) : (
        <>
          <details style={{ marginBottom: 'var(--space-md)' }}>
            <summary style={{ cursor: 'pointer' }}>Read the agreement</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>{nda.body}</pre>
          </details>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {nda.signers.map(s => (
              <li key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>{s.name}</span>
                <span>{s.signed_at ? `Signed ${new Date(s.signed_at).toLocaleDateString('en-IN')}` : 'Not signed yet'}</span>
              </li>
            ))}
          </ul>

          {nda.fully_signed ? (
            <span className="badge badge--primary">Signed by everyone</span>
          ) : mine && !mine.signed_at ? (
            <>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 'var(--space-sm)' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />{' '}
                I have read the agreement and agree to be bound by it.
              </label>
              <button className="btn btn--primary btn--sm" onClick={() => act('sign')} disabled={busy || !agreed}>
                {busy ? 'Signing…' : 'Sign NDA'}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem' }}>Waiting for the others to sign.</p>
          )}
        </>
      )}
    </div>
  )
}
