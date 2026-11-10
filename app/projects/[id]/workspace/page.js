'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ContextBoard from '@/components/ContextBoard/ContextBoard'

export default function ProjectWorkspacePage() {
  const { id } = useParams()
  const [status, setStatus] = useState(null) // { project, isOwner, isMember, canAccept, accepted }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/projects/${id}/accept`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        setStatus(json)
      })
      .catch(() => setError('Failed to load workspace'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleAccept = async () => {
    setAccepting(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${id}/accept`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      load()
    } catch (err) {
      setError(err.message || 'Failed to accept project')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="skeleton" style={{ height: 40, width: 280 }} />
        <div className="skeleton" style={{ height: 200, marginTop: 24, borderRadius: 16 }} />
      </div>
    )
  }

  if (error && !status?.project) {
    return (
      <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="alert alert--error">{error}</div>
      </div>
    )
  }

  const { project, isOwner, isMember, canAccept, accepted } = status

  // Unaccepted — show the right next step
  if (!accepted) {
    return (
      <div className="container" style={{ padding: 'var(--space-xl) 0', maxWidth: 640 }}>
        <Link href={`/projects/${id}`} style={{ display: 'inline-block', marginBottom: 'var(--space-lg)' }}>
          ← Back to project
        </Link>
        <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>🔒</div>
          <h1 style={{ marginBottom: 'var(--space-sm)' }}>Workspace not open yet</h1>
          {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {canAccept ? (
            <>
              <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                &ldquo;{project.title}&rdquo; was posted for {project.collectives?.name || 'your team'}.
                Accept it to open the project workspace and start sharing context.
              </p>
              <button className="btn btn--primary btn--lg" onClick={handleAccept} disabled={accepting} id="accept-project-btn">
                {accepting ? 'Accepting…' : `✅ Accept for ${project.collectives?.name || 'your team'}`}
              </button>
            </>
          ) : isOwner ? (
            <p style={{ color: 'var(--cl-text-secondary)' }}>
              Waiting for {project.collectives?.name || 'the assigned team'} to accept this project.
              The workspace opens as soon as they do.
            </p>
          ) : isMember ? (
            <p style={{ color: 'var(--cl-text-secondary)' }}>
              Only a team owner or admin can accept this project on behalf of {project.collectives?.name}.
            </p>
          ) : (
            <p style={{ color: 'var(--cl-text-secondary)' }}>
              This project doesn&apos;t have a workspace open yet.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Accepted but viewer has no stake in it — don't show the board
  if (!isOwner && !isMember) {
    return (
      <div className="container" style={{ padding: 'var(--space-xl) 0', maxWidth: 640 }}>
        <div className="alert alert--error">You don&apos;t have access to this project&apos;s workspace.</div>
      </div>
    )
  }

  return (
    <ContextBoard
      collectiveId={project.collective_id}
      projectId={project.id}
      teamName={project.collectives?.name || 'Team'}
      projectTitle={project.title}
    />
  )
}
