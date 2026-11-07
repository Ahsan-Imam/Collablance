'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/lib/hooks/useRole'
import AddRoleButton from '@/components/AddRoleButton/AddRoleButton'
import './create.css'

export default function CreateProjectPage() {
  const [formData, setFormData] = useState({
    title: '', description: '', budget_min: '', budget_max: '',
    deadline: '', skills: '', collective_id: '',
  })
  const [collectives, setCollectives] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { isClient, loading: roleLoading } = useRole()

  // Collectives the user belongs to — a project can optionally be posted for one
  useEffect(() => {
    fetch('/api/collectives?mine=true')
      .then(r => r.json())
      .then(json => setCollectives(json.data || []))
      .catch(() => {})
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const budgetMin = formData.budget_min ? Number(formData.budget_min) : null
    const budgetMax = formData.budget_max ? Number(formData.budget_max) : null
    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      setError('Minimum budget cannot be higher than maximum budget.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          budget_min: budgetMin,
          budget_max: budgetMax,
          deadline: formData.deadline || null,
          skills_needed: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
          collective_id: formData.collective_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      router.push('/client')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (roleLoading) {
    return (
      <div className="create-project-page">
        <div className="container container--narrow">
          <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="create-project-page">
        <div className="container container--narrow">
          <div className="card create-project__blocked animate-fade-in-up">
            <div className="create-project__blocked-icon">💼</div>
            <h1 className="create-project__title">Posting projects needs client access</h1>
            <p className="create-project__subtitle">
              Hiring for something? Add client access to this same account — same email,
              same login. You can switch between client and freelancer from the top bar anytime.
            </p>
            <AddRoleButton role="client">Add client access</AddRoleButton>
            <Link href="/projects" className="btn btn--ghost">Just browse projects</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="create-project-page">
      <div className="container container--narrow">
        <div className="create-project__header animate-fade-in-up">
          <h1 className="create-project__title">Post a Project</h1>
          <p className="create-project__subtitle">
            Describe the work, set a budget, and let collectives find you.
          </p>
        </div>

        {error && (
          <div className="alert alert--error" id="create-project-error">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card create-project__form animate-fade-in-up" style={{ animationDelay: '100ms' }} id="create-project-form">
          <div className="input-group">
            <label htmlFor="title" className="input-label">Project Title</label>
            <input id="title" name="title" type="text" className="input"
              placeholder="e.g. E-commerce site for a local bakery"
              value={formData.title} onChange={handleChange}
              required maxLength={120} />
          </div>

          <div className="input-group">
            <label htmlFor="description" className="input-label">Description</label>
            <textarea id="description" name="description" className="input textarea"
              placeholder="What needs to be built? Scope, deliverables, and anything a team should know."
              value={formData.description} onChange={handleChange}
              required maxLength={2000} />
            <span className="input-hint">{formData.description.length}/2000 characters</span>
          </div>

          <div className="create-project__row">
            <div className="input-group">
              <label htmlFor="budget_min" className="input-label">Budget Min (₹)</label>
              <input id="budget_min" name="budget_min" type="number" className="input"
                placeholder="e.g. 20000" min="0"
                value={formData.budget_min} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="budget_max" className="input-label">Budget Max (₹)</label>
              <input id="budget_max" name="budget_max" type="number" className="input"
                placeholder="e.g. 50000" min="0"
                value={formData.budget_max} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="deadline" className="input-label">Deadline</label>
              <input id="deadline" name="deadline" type="date" className="input"
                value={formData.deadline} onChange={handleChange} />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="skills" className="input-label">Skills Needed</label>
            <input id="skills" name="skills" type="text" className="input"
              placeholder="React, Figma, Node.js"
              value={formData.skills} onChange={handleChange} />
            <span className="input-hint">Comma separated</span>
          </div>

          {collectives.length > 0 && (
            <div className="input-group">
              <label htmlFor="collective_id" className="input-label">Post for a Collective (optional)</label>
              <select id="collective_id" name="collective_id" className="input"
                value={formData.collective_id} onChange={handleChange}>
                <option value="">None — post as myself</option>
                {collectives.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="create-project__actions">
            <button type="button" className="btn btn--ghost" onClick={() => router.back()}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--lg"
              disabled={loading} id="create-project-submit">
              {loading ? 'Posting...' : 'Post Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
