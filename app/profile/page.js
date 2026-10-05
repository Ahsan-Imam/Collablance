'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import './profile.css'

const SKILL_OPTIONS = [
  'React', 'Next.js', 'Node.js', 'Python', 'Django', 'Flask',
  'JavaScript', 'TypeScript', 'HTML/CSS', 'Figma', 'UI/UX Design',
  'Graphic Design', 'Illustration', 'Copywriting', 'Content Writing',
  'SEO', 'Digital Marketing', 'Video Editing', 'Photography',
  'Mobile Dev', 'Flutter', 'React Native', 'Swift', 'Kotlin',
  'Data Science', 'Machine Learning', 'DevOps', 'AWS', 'PostgreSQL',
  'MongoDB', 'Supabase', 'Firebase', 'WordPress', 'Shopify',
]

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    full_name: '',
    bio: '',
    skills: [],
    hourly_rate: '',
    location: '',
    portfolio_url: '',
    experience_years: '',
  })
  const [skillSearch, setSkillSearch] = useState('')
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        // Load profile from metadata for now; will switch to DB table
        const meta = user.user_metadata || {}
        setProfile(prev => ({
          ...prev,
          full_name: meta.full_name || '',
          bio: meta.bio || '',
          skills: meta.skills || [],
          hourly_rate: meta.hourly_rate || '',
          location: meta.location || '',
          portfolio_url: meta.portfolio_url || '',
          experience_years: meta.experience_years || '',
        }))
      }
      setLoading(false)
    })
  }, [])

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const addSkill = (skill) => {
    if (!profile.skills.includes(skill) && profile.skills.length < 15) {
      setProfile({ ...profile, skills: [...profile.skills, skill] })
      setSaved(false)
    }
    setSkillSearch('')
    setShowSkillDropdown(false)
  }

  const removeSkill = (skill) => {
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) })
    setSaved(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          bio: profile.bio,
          skills: profile.skills,
          hourly_rate: profile.hourly_rate,
          location: profile.location,
          portfolio_url: profile.portfolio_url,
          experience_years: profile.experience_years,
        },
      })

      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Profile save error:', err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredSkills = SKILL_OPTIONS.filter(
    s => s.toLowerCase().includes(skillSearch.toLowerCase()) && !profile.skills.includes(s)
  )

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container container--narrow">
          <div className="skeleton" style={{ height: '40px', width: '250px' }} />
          <div className="skeleton" style={{ height: '400px', marginTop: '24px', borderRadius: '16px' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="container container--narrow">
        <div className="profile-page__header animate-fade-in-up">
          <div className="avatar avatar--xl">
            {profile.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="profile-page__title">Your Profile</h1>
            <p className="profile-page__subtitle">
              This is how clients and collectives see you.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="profile-form card animate-fade-in-up" style={{ animationDelay: '100ms' }} id="profile-form">
          <div className="profile-form__grid">
            <div className="input-group">
              <label htmlFor="full_name" className="input-label">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="input"
                placeholder="Your full name"
                value={profile.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="location" className="input-label">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                className="input"
                placeholder="e.g. Pune, India"
                value={profile.location}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label htmlFor="hourly_rate" className="input-label">Hourly Rate (₹)</label>
              <input
                id="hourly_rate"
                name="hourly_rate"
                type="number"
                className="input"
                placeholder="e.g. 1500"
                value={profile.hourly_rate}
                onChange={handleChange}
                min="0"
              />
            </div>

            <div className="input-group">
              <label htmlFor="experience_years" className="input-label">Years of Experience</label>
              <input
                id="experience_years"
                name="experience_years"
                type="number"
                className="input"
                placeholder="e.g. 3"
                value={profile.experience_years}
                onChange={handleChange}
                min="0"
                max="50"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="bio" className="input-label">Bio</label>
            <textarea
              id="bio"
              name="bio"
              className="input textarea"
              placeholder="Tell us about yourself, your expertise, and what you love working on..."
              value={profile.bio}
              onChange={handleChange}
              maxLength={500}
            />
            <span className="input-hint">{profile.bio.length}/500 characters</span>
          </div>

          <div className="input-group">
            <label htmlFor="portfolio_url" className="input-label">Portfolio URL</label>
            <input
              id="portfolio_url"
              name="portfolio_url"
              type="url"
              className="input"
              placeholder="https://yourportfolio.com"
              value={profile.portfolio_url}
              onChange={handleChange}
            />
          </div>

          {/* Skill Tags */}
          <div className="input-group">
            <label className="input-label">Skills (up to 15)</label>
            <div className="skill-tags">
              {profile.skills.map(skill => (
                <span key={skill} className="skill-tag">
                  {skill}
                  <button
                    type="button"
                    className="skill-tag__remove"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="skill-search-wrapper">
              <input
                type="text"
                className="input"
                placeholder="Search and add skills..."
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value)
                  setShowSkillDropdown(true)
                }}
                onFocus={() => setShowSkillDropdown(true)}
                onBlur={() => setTimeout(() => setShowSkillDropdown(false), 200)}
                id="skill-search"
              />
              {showSkillDropdown && skillSearch && filteredSkills.length > 0 && (
                <div className="skill-dropdown">
                  {filteredSkills.slice(0, 8).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      className="skill-dropdown__item"
                      onMouseDown={() => addSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="profile-form__footer">
            {saved && (
              <span className="profile-form__saved animate-fade-in">
                ✓ Profile saved successfully
              </span>
            )}
            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={saving}
              id="profile-save"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
