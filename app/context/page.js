'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import './context.css'

// ── Section metadata ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'all',         label: 'All',           emoji: '🌐', color: 'var(--cl-primary-500)' },
  { id: 'building',    label: 'Building',       emoji: '🔨', color: '#7c3aed' },
  { id: 'perspective', label: 'Perspective',    emoji: '🧭', color: '#0891b2' },
  { id: 'goals',       label: 'Goals',          emoji: '🎯', color: '#059669' },
  { id: 'decisions',   label: 'Decisions',      emoji: '⚖️',  color: '#d97706' },
  { id: 'blockers',    label: 'Blockers',       emoji: '🚧', color: '#dc2626' },
  { id: 'context',     label: 'Notes',          emoji: '📝', color: '#475569' },
]

const SECTION_MAP = Object.fromEntries(SECTIONS.map(s => [s.id, s]))

// ── Relative time helper ────────────────────────────────────────────────────
function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Context Card ────────────────────────────────────────────────────────────
function ContextCard({ card, currentUserId, onDelete, onPin }) {
  const sec = SECTION_MAP[card.section] || SECTION_MAP.context
  const isOwner = card.user_id === currentUserId
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this card?')) return
    setDeleting(true)
    await onDelete(card.id)
  }

  return (
    <div className={`ctx-card ${card.is_pinned ? 'ctx-card--pinned' : ''} animate-fade-in-up`}
      style={{ '--sec-color': sec.color }}>
      {card.is_pinned && <div className="ctx-card__pin">📌 Pinned</div>}
      <div className="ctx-card__header">
        <div className="ctx-card__author">
          <div className="avatar avatar--sm ctx-card__avatar">
            {card.avatar_initial || '?'}
          </div>
          <div>
            <span className="ctx-card__name">{card.display_name}</span>
            <span className="ctx-card__time">{relativeTime(card.updated_at)}</span>
          </div>
        </div>
        <div className="ctx-card__section-badge" style={{ background: `${sec.color}18`, color: sec.color }}>
          {sec.emoji} {sec.label}
        </div>
      </div>
      <h3 className="ctx-card__title">{card.title}</h3>
      <p className="ctx-card__content">{card.content}</p>
      {card.tags?.length > 0 && (
        <div className="ctx-card__tags">
          {card.tags.map(t => (
            <span key={t} className="badge badge--neutral ctx-card__tag">#{t}</span>
          ))}
        </div>
      )}
      {isOwner && (
        <div className="ctx-card__actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => onPin(card.id, !card.is_pinned)}
            id={`pin-${card.id}`}
          >
            {card.is_pinned ? '📌 Unpin' : 'Pin'}
          </button>
          <button
            className="btn btn--danger btn--sm"
            onClick={handleDelete}
            disabled={deleting}
            id={`delete-${card.id}`}
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add Card Form ────────────────────────────────────────────────────────────
function AddCardForm({ onAdd, onCancel }) {
  const [section, setSection] = useState('building')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          title: title.trim(),
          content: content.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onAdd(json.data)
    } catch (err) {
      setError(err.message || 'Failed to add card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ctx-form animate-scale-in" id="add-context-form">
      <div className="ctx-form__header">
        <h3 className="ctx-form__title">Share Your Context</h3>
        <button className="btn btn--ghost btn--sm" onClick={onCancel} id="cancel-context">✕</button>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label className="input-label">Section</label>
          <div className="ctx-form__section-grid">
            {SECTIONS.filter(s => s.id !== 'all').map(s => (
              <button
                key={s.id}
                type="button"
                className={`ctx-section-btn ${section === s.id ? 'ctx-section-btn--active' : ''}`}
                style={{ '--sec-color': s.color }}
                onClick={() => setSection(s.id)}
                id={`section-${s.id}`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="ctx-title" className="input-label">Title</label>
          <input
            id="ctx-title"
            className="input"
            placeholder="e.g. Redesigning the onboarding flow"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="input-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="ctx-content" className="input-label">Content</label>
          <textarea
            id="ctx-content"
            className="input textarea"
            placeholder="Share what you're doing, thinking, or building..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            required
          />
        </div>

        <div className="input-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="ctx-tags" className="input-label">Tags <span className="input-hint">(comma separated)</span></label>
          <input
            id="ctx-tags"
            className="input"
            placeholder="react, api, design"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="submit"
            className="btn btn--primary btn--lg"
            disabled={loading}
            id="submit-context"
          >
            {loading ? 'Sharing...' : '🚀 Share Context'}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--lg"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ContextPage() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)  // null = not searching
  const [searchMode, setSearchMode] = useState(null)        // 'vector' | 'text'
  const [searching, setSearching] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  // Load current user
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null)
    })
  }, [])

  // Fetch cards
  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('section', filter)
      const res = await fetch(`/api/context?${params}`)
      const json = await res.json()
      setCards(json.data || [])
    } catch {
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('team_context_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'team_context' },
        () => fetchCards()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchCards])

  const handleAdd = (newCard) => {
    setCards(prev => [newCard, ...prev])
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    await fetch(`/api/context/${id}`, { method: 'DELETE' })
    setCards(prev => prev.filter(c => c.id !== id))
    if (searchResults) setSearchResults(prev => prev.filter(c => c.id !== id))
  }

  const handlePin = async (id, pinned) => {
    const res = await fetch(`/api/context/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: pinned }),
    })
    const json = await res.json()
    if (json.data) {
      setCards(prev => prev.map(c => c.id === id ? json.data : c)
        .sort((a, b) => (b.is_pinned - a.is_pinned) || new Date(b.updated_at) - new Date(a.updated_at))
      )
    }
  }

  // Semantic search — debounced 400ms
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null)
      setSearchMode(null)
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch('/api/context/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search.trim(), limit: 20 }),
        })
        const json = await res.json()
        setSearchResults(json.data || [])
        setSearchMode(json.mode || null)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Group cards by member for summary view
  const memberMap = {}
  cards.forEach(c => {
    if (!memberMap[c.user_id]) memberMap[c.user_id] = { name: c.display_name, initial: c.avatar_initial, count: 0 }
    memberMap[c.user_id].count++
  })
  const members = Object.values(memberMap)

  // Which cards to show: search results override the normal list
  const visible = searchResults !== null ? searchResults : cards

  return (
    <div className="ctx-page">
      {/* Header */}
      <div className="ctx-page__hero">
        <div className="ctx-page__orb ctx-page__orb--1" />
        <div className="ctx-page__orb ctx-page__orb--2" />
        <div className="container">
          <div className="ctx-page__hero-inner animate-fade-in-up">
            <div>
              <div className="ctx-page__badge">
                <span className="badge badge--primary">🧠 AI Context Window</span>
              </div>
              <h1 className="ctx-page__title">Team Context Board</h1>
              <p className="ctx-page__subtitle">
                Share what you're building, your blockers, decisions, and perspective.
                Your AI tools read this to stay in sync with the whole team.
              </p>
            </div>
            <button
              className="btn btn--primary btn--xl"
              onClick={() => setShowForm(!showForm)}
              id="add-context-btn"
            >
              {showForm ? '✕ Cancel' : '+ Share Context'}
            </button>
          </div>

          {/* Member Pills */}
          {members.length > 0 && (
            <div className="ctx-members animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <span className="ctx-members__label">Active:</span>
              {members.map((m, i) => (
                <div key={i} className="ctx-member-pill">
                  <div className="avatar avatar--sm">{m.initial}</div>
                  <span>{m.name}</span>
                  <span className="ctx-member-pill__count">{m.count}</span>
                </div>
              ))}
              {members.length === 0 && (
                <span className="ctx-members__empty">No members yet — be the first!</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container ctx-page__body">
        {/* Add Form */}
        {showForm && (
          <AddCardForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
        )}

        {/* Filters + Search */}
        <div className="ctx-controls animate-fade-in-up">
          <div className="ctx-filter-tabs">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                className={`ctx-filter-tab ${filter === s.id ? 'ctx-filter-tab--active' : ''}`}
                onClick={() => { setFilter(s.id); setSearch(''); setSearchResults(null) }}
                style={{ '--sec-color': s.color }}
                id={`filter-tab-${s.id}`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <div className="ctx-search-wrap">
            <input
              className="input ctx-search"
              placeholder="✨ Semantic search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="context-search"
            />
            {searching && <span className="ctx-search-spin">⟳</span>}
            {searchMode && !searching && (
              <span className={`ctx-search-badge ctx-search-badge--${searchMode}`}>
                {searchMode === 'vector' ? '🧠 vector' : '🔤 text'}
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="ctx-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="ctx-empty animate-scale-in">
            <div className="ctx-empty__icon">🧠</div>
            <h2 className="ctx-empty__title">
              {cards.length === 0 ? 'No context shared yet' : 'No results found'}
            </h2>
            <p className="ctx-empty__desc">
              {cards.length === 0
                ? 'Be the first to share what you\'re building. AI tools and teammates will see it here.'
                : 'Try adjusting your search or filter.'}
            </p>
            {cards.length === 0 && (
              <button className="btn btn--primary btn--lg" onClick={() => setShowForm(true)} id="empty-add-ctx">
                Share Your First Context
              </button>
            )}
          </div>
        ) : (
          <div className="ctx-grid">
            {visible.map(card => (
              <ContextCard
                key={card.id}
                card={card}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            ))}
          </div>
        )}

        {/* MCP Info Banner */}
        <div className="ctx-mcp-banner animate-fade-in-up">
          <div className="ctx-mcp-banner__icon">🤖</div>
          <div className="ctx-mcp-banner__content">
            <h4 className="ctx-mcp-banner__title">AI Tools can read this board</h4>
            <p className="ctx-mcp-banner__desc">
              Connect external AI tools (Claude Desktop, Cursor, VS Code) via the CollabLance MCP server.
              Your AI assistant will automatically have context about what the whole team is building.
            </p>
            <code className="ctx-mcp-banner__cmd">
              mcp-server: collablance-context · endpoint: /api/mcp
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
