'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../collectives.css'
import './create.css'

const FOCUS_AREAS = [
  { value: 'web_development',    label: 'Web Development' },
  { value: 'mobile_development', label: 'Mobile Development' },
  { value: 'design',             label: 'Design & Creative' },
  { value: 'content',            label: 'Content & Marketing' },
  { value: 'data_science',       label: 'Data Science & AI' },
  { value: 'devops',             label: 'DevOps & Cloud' },
  { value: 'fullstack',          label: 'Full-Stack / Mixed' },
  { value: 'other',              label: 'Other' },
]

export default function CreateCollectivePage() {
  const [formData, setFormData] = useState({ name: '', description: '', focus_area: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You must be logged in.'); return }

      const res = await fetch('/api/collectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      router.push('/collectives')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-collective-page">
      <div className="container container--narrow">
        <div className="create-collective__header animate-fade-in-up">
          <h1 className="create-collective__title">Create a Collective</h1>
          <p className="create-collective__subtitle">
            Name your team, describe your mission, and invite freelancers.
          </p>
        </div>

        {error && (
          <div className="alert alert--error" id="create-error">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card create-collective__form animate-fade-in-up" style={{ animationDelay: '100ms' }} id="create-collective-form">
          <div className="input-group">
            <label htmlFor="name" className="input-label">Collective Name</label>
            <input id="name" name="name" type="text" className="input"
              placeholder="e.g. PixelForge Studios"
              value={formData.name} onChange={handleChange}
              required maxLength={60} />
            <span className="input-hint">This is your team's public identity.</span>
          </div>

          <div className="input-group">
            <label htmlFor="description" className="input-label">Description</label>
            <textarea id="description" name="description" className="input textarea"
              placeholder="What does your collective specialize in? What makes your team unique?"
              value={formData.description} onChange={handleChange}
              required maxLength={300} />
            <span className="input-hint">{formData.description.length}/300 characters</span>
          </div>

          <div className="input-group">
            <label htmlFor="focus_area" className="input-label">Focus Area</label>
            <select id="focus_area" name="focus_area" className="input"
              value={formData.focus_area} onChange={handleChange} required>
              <option value="">Select a focus area</option>
              {FOCUS_AREAS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="create-collective__actions">
            <button type="button" className="btn btn--ghost" onClick={() => router.back()}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--lg"
              disabled={loading} id="create-collective-submit">
              {loading ? 'Creating...' : 'Create Collective'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
