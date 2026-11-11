'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../projects.css'
import './project.css'

const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }
const STATUS_COLORS = { open: '#059669', in_progress: '#d97706', completed: '#6366f1', cancelled: '#dc2626' }
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

function formatBudget(p) {
  const sym = CURRENCY_SYMBOLS[p.currency] || `${p.currency || ''} `
  const fmt = (n) => `${sym}${Number(n).toLocaleString()}`
  if (p.budget_min && p.budget_max) return `${fmt(p.budget_min)} – ${fmt(p.budget_max)}`
  if (p.budget_min) return `From ${fmt(p.budget_min)}`
  if (p.budget_max) return `Up to ${fmt(p.budget_max)}`
  return 'Budget TBD'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Fact({ label, children }) {
  return (
    <div className="project-fact">
      <span className="project-fact__label">{label}</span>
      <span className="project-fact__value">{children}</span>
    </div>
  )
}

const MILESTONE_STATUS_LABELS = { pending: 'Pending', submitted: 'Submitted', approved: 'Approved', paid: 'Paid', disputed: 'Disputed' }
const MILESTONE_STATUS_COLORS = { pending: '#6b7280', submitted: '#d97706', approved: '#059669', paid: '#6366f1', disputed: '#dc2626' }

function Stars({ value }) {
  return <span aria-label={`${value} out of 5 stars`}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
}

function MilestoneForm({ projectId, onAdd, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), amount, due_date: dueDate || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onAdd(json.data)
    } catch (err) {
      setError(err.message || 'Failed to add milestone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>⚠️ {error}</div>}
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <label className="input-label" htmlFor="ms-title">Title</label>
        <input id="ms-title" className="input" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <label className="input-label" htmlFor="ms-desc">Description</label>
        <textarea id="ms-desc" className="input textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label" htmlFor="ms-amount">Amount (₹)</label>
          <input id="ms-amount" type="number" min="1" className="input" value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label" htmlFor="ms-due">Due date</label>
          <input id="ms-due" type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn--primary btn--sm" type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Milestone'}</button>
        <button className="btn btn--ghost btn--sm" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function ApplyForm({ myTeams, onSubmit }) {
  const [collectiveId, setCollectiveId] = useState(myTeams[0]?.id || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit({ collective_id: collectiveId, message })
    } catch (err) {
      setError(err.message || 'Failed to apply')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
      <h2 className="project-detail__section-title" style={{ marginBottom: 'var(--space-sm)' }}>Apply as a Team</h2>
      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>⚠️ {error}</div>}
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <label className="input-label" htmlFor="apply-team">Team</label>
        <select id="apply-team" className="input" value={collectiveId} onChange={e => setCollectiveId(e.target.value)} required>
          {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <label className="input-label" htmlFor="apply-message">Message (optional)</label>
        <textarea id="apply-message" className="input textarea" rows={3} placeholder="Why your team is a good fit…" value={message} onChange={e => setMessage(e.target.value)} />
      </div>
      <button className="btn btn--primary" type="submit" disabled={loading || !collectiveId}>
        {loading ? 'Applying…' : '📨 Apply'}
      </button>
    </form>
  )
}

function ContractSection({ projectId, collectiveId, teamMembers, userId, isLeader, canSign }) {
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [splitInputs, setSplitInputs] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/contracts?collective_id=${collectiveId}`)
      .then(r => r.json())
      .then(json => setContract(json.data || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, collectiveId])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const splits = teamMembers.map(m => ({ user_id: m.user_id, percent: Number(splitInputs[m.user_id] || 0) }))
      const res = await fetch(`/api/projects/${projectId}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collective_id: collectiveId, splits }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setContract(json.data)
    } catch (err) {
      setError(err.message || 'Failed to propose split')
    } finally {
      setBusy(false)
    }
  }

  const handleSign = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/contracts/${contract.id}/sign`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setContract(json.data)
    } catch (err) {
      setError(err.message || 'Failed to sign')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  const allFilled = teamMembers.every(m => Number(splitInputs[m.user_id]) > 0)
  const total = teamMembers.reduce((sum, m) => sum + (Number(splitInputs[m.user_id]) || 0), 0)
  const mySigned = contract?.signatures?.some(s => s.user_id === userId)
  const nameFor = (uid) => teamMembers.find(m => m.user_id === uid)?.profiles?.full_name || 'Member'

  return (
    <div className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
      <h2 className="project-detail__section-title" style={{ marginBottom: 'var(--space-sm)' }}>💰 Payment Split Contract</h2>
      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>⚠️ {error}</div>}

      {!contract ? (
        isLeader ? (
          <form onSubmit={handleCreate}>
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
              Propose how the payout splits across the team — must add up to 100%. Every member has to sign before this project can be accepted.
            </p>
            {teamMembers.map(m => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '0.5rem' }}>
                <span style={{ flex: 1 }}>{m.profiles?.full_name || 'Member'}</span>
                <input
                  type="number" min="1" max="100" className="input" style={{ width: 90 }}
                  value={splitInputs[m.user_id] || ''}
                  onChange={e => setSplitInputs(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                  required
                />
                <span>%</span>
              </div>
            ))}
            <p style={{ fontSize: '0.8125rem', color: allFilled && total === 100 ? 'var(--cl-primary-600)' : '#dc2626', marginBottom: 'var(--space-md)' }}>
              Total: {total}%{!allFilled ? ' — every member needs a number' : total !== 100 ? ' — must equal 100%' : ' ✓'}
            </p>
            <button className="btn btn--primary btn--sm" type="submit" disabled={busy || !allFilled || total !== 100}>
              {busy ? 'Proposing…' : 'Propose Split'}
            </button>
          </form>
        ) : (
          <p style={{ color: 'var(--cl-text-secondary)' }}>Your team leader hasn&apos;t proposed a payment split yet.</p>
        )
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 'var(--space-md)' }}>
            {contract.splits.map(s => {
              const signed = contract.signatures.some(sig => sig.user_id === s.user_id)
              return (
                <div key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>{nameFor(s.user_id)} — {s.percent}%</span>
                  <span>{signed ? '✅ Signed' : '⏳ Pending'}</span>
                </div>
              )
            })}
          </div>
          {contract.status === 'signed' ? (
            <span className="badge badge--primary">🔒 Fully signed &amp; locked</span>
          ) : mySigned || !canSign ? (
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem' }}>Waiting on the rest of the team to sign.</p>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={handleSign} disabled={busy}>
              {busy ? 'Signing…' : '✍️ Sign Contract'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ReviewForm({ title, onSubmit }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit({ rating, comment: comment.trim() })
    } catch (err) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', fontSize: '1.5rem', cursor: 'pointer' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} onClick={() => setRating(n)} role="button" aria-label={`${n} stars`}>
            {n <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <textarea className="input textarea" rows={2} placeholder="Optional comment" value={comment} onChange={e => setComment(e.target.value)} />
      </div>
      <button className="btn btn--primary btn--sm" type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit Review'}</button>
    </form>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isTeamMember, setIsTeamMember] = useState(false)
  const [milestones, setMilestones] = useState([])
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneBusyId, setMilestoneBusyId] = useState(null)
  const [reviews, setReviews] = useState([])
  const [myOwnedTeams, setMyOwnedTeams] = useState([])
  const [applications, setApplications] = useState([])
  const [appliedTeamIds, setAppliedTeamIds] = useState(new Set())
  const [applicationBusyId, setApplicationBusyId] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null))

    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        setProject(json.data || null)
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false))

    fetch(`/api/projects/${id}/accept`)
      .then(r => r.json())
      .then(json => setIsTeamMember(!!json.isMember))
      .catch(() => {})

    fetch(`/api/projects/${id}/milestones`)
      .then(r => r.json())
      .then(json => setMilestones(json.data || []))
      .catch(() => {})

    fetch(`/api/projects/${id}/reviews`)
      .then(r => r.json())
      .then(json => setReviews(json.data || []))
      .catch(() => {})

    // Teams I own, in case this project is open for applications
    fetch('/api/collectives?mine=true')
      .then(r => r.json())
      .then(json => {
        createClient().auth.getUser().then(({ data: { user } }) => {
          setMyOwnedTeams((json.data || []).filter(t => ['owner', 'admin'].includes(t.my_role)))
        })
      })
      .catch(() => {})

    // If I own this project, see who's applied; if I lead an applying team,
    // see my own team's application
    fetch(`/api/projects/${id}/applications`)
      .then(r => r.json())
      .then(json => setApplications(json.data || []))
      .catch(() => {})
  }, [id])

  // Which team's payment split contract is relevant here — either the team
  // already assigned to the project, or (while applying) my own team's
  // pending/accepted application
  const contractCollectiveId = project?.collective_id && (isTeamMember || userId === project.owner_id)
    ? project.collective_id
    : applications.find(a => ['pending', 'accepted'].includes(a.status) && myOwnedTeams.some(t => t.id === a.collective_id))?.collective_id || null
  const isContractTeamLeader = myOwnedTeams.some(t => t.id === contractCollectiveId)

  useEffect(() => {
    if (!contractCollectiveId) return
    fetch(`/api/collectives/${contractCollectiveId}`)
      .then(r => r.json())
      .then(json => setTeamMembers(json.data?.collective_members || []))
      .catch(() => {})
  }, [contractCollectiveId])

  const handleApply = async ({ collective_id: collectiveId, message }) => {
    const res = await fetch(`/api/projects/${id}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collective_id: collectiveId, message }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setAppliedTeamIds(prev => new Set(prev).add(collectiveId))
  }

  const handleApplication = async (applicationId, action) => {
    setApplicationBusyId(applicationId)
    setError('')
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (action === 'accept') {
        setApplications(prev => prev.map(a => a.id === applicationId
          ? { ...a, status: 'accepted' }
          : a.status === 'pending' ? { ...a, status: 'rejected' } : a))
        setProject(prev => ({ ...prev, status: 'in_progress', collective_id: applications.find(a => a.id === applicationId)?.collective_id }))
      } else {
        setApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status: json.data.status } : a))
      }
    } catch (err) {
      setError(err.message || 'Failed to update application')
    } finally {
      setApplicationBusyId(null)
    }
  }

  const handleMilestoneStatus = async (milestoneId, status) => {
    setMilestoneBusyId(milestoneId)
    setError('')
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMilestones(prev => prev.map(m => m.id === milestoneId ? json.data : m))
    } catch (err) {
      setError(err.message || 'Failed to update milestone')
    } finally {
      setMilestoneBusyId(null)
    }
  }

  const handleDeleteMilestone = async (milestoneId) => {
    if (!confirm('Delete this milestone?')) return
    setMilestoneBusyId(milestoneId)
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMilestones(prev => prev.filter(m => m.id !== milestoneId))
    } catch (err) {
      setError(err.message || 'Failed to delete milestone')
    } finally {
      setMilestoneBusyId(null)
    }
  }

  const submitReview = async (direction, { rating, comment }) => {
    const res = await fetch(`/api/projects/${id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, rating, comment }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setReviews(prev => [json.data, ...prev])
  }

  const handleStatusChange = async (status) => {
    setUpdating(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      // PATCH doesn't return the owner profile — keep the one we already have
      setProject(prev => ({ ...prev, ...json.data, owner: prev.owner }))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/projects')
    } catch (err) {
      setError(err.message || 'Failed to delete project')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="project-detail">
        <div className="container">
          <div className="skeleton" style={{ height: 40, width: 320 }} />
          <div className="skeleton" style={{ height: 260, marginTop: 24, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="project-detail">
        <div className="container">
          <Link href="/projects" className="project-detail__back">← Back to projects</Link>
          <div className="projects-empty">
            <div className="projects-empty__icon">🔍</div>
            <h2 className="projects-empty__title">Project not found</h2>
            <p className="projects-empty__desc">{error || 'It may have been deleted.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = userId && userId === project.owner_id
  const ownerName = project.owner?.full_name || 'Project owner'

  return (
    <div className="project-detail">
      <div className="container">
        <Link href="/projects" className="project-detail__back">← Back to projects</Link>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="project-detail__header animate-fade-in-up">
          <div>
            <h1 className="project-detail__title">{project.title}</h1>
            <span className="project-detail__status" style={{ color: STATUS_COLORS[project.status] }}>
              ● {STATUS_LABELS[project.status] || project.status}
            </span>
          </div>
        </div>

        <div className="project-detail__layout animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="card">
            <h2 className="project-detail__section-title">Description</h2>
            <p className="project-detail__desc">{project.description}</p>

            {project.skills_needed?.length > 0 && (
              <>
                <h2 className="project-detail__section-title" style={{ marginTop: 'var(--space-xl)' }}>Skills Needed</h2>
                <div className="project-detail__skills" style={{ marginTop: 0 }}>
                  {project.skills_needed.map(s => (
                    <span key={s} className="badge badge--neutral">{s}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="card project-detail__facts">
            <Fact label="Budget">💰 {formatBudget(project)}</Fact>
            <Fact label="Deadline">{project.deadline ? `📅 ${formatDate(project.deadline)}` : 'No deadline'}</Fact>
            <Fact label="Team">
              {project.collectives
                ? <Link href={`/teams/${project.collectives.id}`}>👥 {project.collectives.name}</Link>
                : 'Independent'}
            </Fact>
            {project.collective_id && (
              <Fact label="Workspace">
                <Link href={`/projects/${project.id}/workspace`}>
                  {project.accepted_at ? '🧠 Open workspace' : '🔒 Workspace (not accepted yet)'}
                </Link>
              </Fact>
            )}
            <Fact label="Posted by">
              <span className="project-detail__owner">
                <span className="avatar avatar--sm">{ownerName[0].toUpperCase()}</span>
                {isOwner ? `${ownerName} (you)` : ownerName}
              </span>
            </Fact>
            <Fact label="Posted on">{formatDate(project.created_at)}</Fact>
            {project.updated_at && project.updated_at !== project.created_at && (
              <Fact label="Last updated">{formatDate(project.updated_at)}</Fact>
            )}

            {isOwner && (
              <div className="project-detail__owner-actions">
                <label htmlFor="project-status" className="input-label">Status</label>
                <select id="project-status" className="input"
                  value={project.status} disabled={updating}
                  onChange={(e) => handleStatusChange(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>

                <div className="project-detail__danger">
                  {confirmDelete ? (
                    <>
                      <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                        Cancel
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={handleDelete} disabled={deleting} id="project-delete-confirm">
                        {deleting ? 'Deleting...' : 'Yes, delete'}
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(true)} id="project-delete">
                      Delete project
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>

        {!isOwner && project.status === 'open' && !project.collective_id && myOwnedTeams.length > 0 && (
          <ApplyForm myTeams={myOwnedTeams} onSubmit={handleApply} />
        )}

        {isOwner && project.status === 'open' && !project.collective_id && (
          <div className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
            <h2 className="project-detail__section-title" style={{ marginBottom: 'var(--space-md)' }}>Applications</h2>
            {applications.length === 0 ? (
              <p style={{ color: 'var(--cl-text-secondary)' }}>No applications yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {applications.map(a => (
                  <div key={a.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <div className="avatar avatar--sm">{a.collectives?.avatar_initial || '?'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        <Link href={`/teams/${a.collectives?.id}`}>{a.collectives?.name}</Link>
                      </div>
                      {a.message && <div style={{ fontSize: '0.8125rem', color: 'var(--cl-text-secondary)' }}>{a.message}</div>}
                    </div>
                    {a.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn--primary btn--sm" disabled={applicationBusyId === a.id} onClick={() => handleApplication(a.id, 'accept')}>
                          Accept
                        </button>
                        <button className="btn btn--ghost btn--sm" disabled={applicationBusyId === a.id} onClick={() => handleApplication(a.id, 'reject')}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="badge badge--neutral">{a.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {contractCollectiveId && teamMembers.length > 0 && (
          <ContractSection
            projectId={id}
            collectiveId={contractCollectiveId}
            teamMembers={teamMembers}
            userId={userId}
            isLeader={isContractTeamLeader}
            canSign={isTeamMember}
          />
        )}

        {(isOwner || isTeamMember) && (
          <div className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h2 className="project-detail__section-title" style={{ margin: 0 }}>Milestones</h2>
              {isOwner && !showMilestoneForm && (
                <button className="btn btn--secondary btn--sm" onClick={() => setShowMilestoneForm(true)} id="add-milestone-btn">
                  + Add Milestone
                </button>
              )}
            </div>

            {showMilestoneForm && (
              <MilestoneForm
                projectId={id}
                onCancel={() => setShowMilestoneForm(false)}
                onAdd={(m) => { setMilestones(prev => [...prev, m]); setShowMilestoneForm(false) }}
              />
            )}

            {milestones.length === 0 ? (
              <p style={{ color: 'var(--cl-text-secondary)' }}>
                {isOwner ? 'No milestones yet — add one to break the project into payable chunks.' : 'The client hasn’t added any milestones yet.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {milestones.map(m => (
                  <div key={m.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      {m.description && <div style={{ fontSize: '0.8125rem', color: 'var(--cl-text-secondary)' }}>{m.description}</div>}
                      <div style={{ fontSize: '0.8125rem', color: 'var(--cl-text-secondary)', marginTop: 2 }}>
                        ₹{Number(m.amount).toLocaleString()}{m.due_date ? ` · due ${formatDate(m.due_date)}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className="badge" style={{ background: `${MILESTONE_STATUS_COLORS[m.status]}18`, color: MILESTONE_STATUS_COLORS[m.status] }}>
                        {MILESTONE_STATUS_LABELS[m.status] || m.status}
                      </span>
                      {isTeamMember && m.status === 'pending' && (
                        <button className="btn btn--primary btn--sm" disabled={milestoneBusyId === m.id} onClick={() => handleMilestoneStatus(m.id, 'submitted')}>
                          Submit
                        </button>
                      )}
                      {isOwner && m.status === 'submitted' && (
                        <>
                          <button className="btn btn--primary btn--sm" disabled={milestoneBusyId === m.id} onClick={() => handleMilestoneStatus(m.id, 'approved')}>
                            Approve
                          </button>
                          <button className="btn btn--ghost btn--sm" disabled={milestoneBusyId === m.id} onClick={() => handleMilestoneStatus(m.id, 'pending')}>
                            Send back
                          </button>
                        </>
                      )}
                      {['submitted', 'approved'].includes(m.status) && (
                        <button className="btn btn--ghost btn--sm" disabled={milestoneBusyId === m.id} onClick={() => handleMilestoneStatus(m.id, 'disputed')}>
                          Dispute
                        </button>
                      )}
                      {isOwner && m.status === 'pending' && (
                        <button className="btn btn--ghost btn--sm" disabled={milestoneBusyId === m.id} onClick={() => handleDeleteMilestone(m.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--cl-text-tertiary)', marginTop: 'var(--space-md)' }}>
              Payment release isn&apos;t wired up yet — approving a milestone records approval but doesn&apos;t move money.
            </p>
          </div>
        )}

        {project.status === 'completed' && (isOwner || isTeamMember) && (
          <div className="card animate-fade-in-up" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
            <h2 className="project-detail__section-title" style={{ marginBottom: 'var(--space-md)' }}>Reviews</h2>

            {isOwner && project.collective_id && !reviews.some(r => r.direction === 'client_to_team') && (
              <ReviewForm title="Rate the team" onSubmit={(r) => submitReview('client_to_team', r)} />
            )}
            {isTeamMember && !reviews.some(r => r.direction === 'team_to_client') && (
              <ReviewForm title="Rate the client" onSubmit={(r) => submitReview('team_to_client', r)} />
            )}

            {reviews.length === 0 ? (
              <p style={{ color: 'var(--cl-text-secondary)' }}>No reviews yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {reviews.map(r => (
                  <div key={r.id} className="card" style={{ padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        {r.direction === 'client_to_team' ? 'Client → Team' : 'Team → Client'}
                      </span>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p style={{ marginTop: 4, fontSize: '0.875rem', color: 'var(--cl-text-secondary)' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
