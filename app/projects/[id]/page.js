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
  }, [id])

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
            <Fact label="Collective">
              {project.collectives
                ? <Link href={`/collectives/${project.collectives.id}`}>👥 {project.collectives.name}</Link>
                : 'Independent'}
            </Fact>
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
      </div>
    </div>
  )
}
