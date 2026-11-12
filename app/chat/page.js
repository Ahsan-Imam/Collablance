'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { createClient } from '@/lib/supabase/client'
import './chat.css'
import Icon from '@/components/Icon/Icon'

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Tool call pill — compact, generic rendering for any tool part ──────────
function ToolPill({ part }) {
  const name = part.type.startsWith('tool-') ? part.type.slice(5) : part.toolName
  const labels = {
    searchTeamContext: 'Searching team context',
    postTeamContext: 'Posting to team context',
    listProjects: 'Looking up projects',
  }
  const label = labels[name] || name

  if (part.state === 'output-error') {
    return <div className="ai-tool-pill ai-tool-pill--error">{label} failed: {part.errorText}</div>
  }
  if (part.state === 'output-available') {
    // Tool results arrive as JSON text
    let output = part.output
    if (typeof output === 'string') { try { output = JSON.parse(output) } catch { output = null } }
    let summary = ''
    if (name === 'searchTeamContext') summary = `${output?.results?.length ?? 0} result(s)`
    if (name === 'postTeamContext') summary = output?.posted ? `"${output.card?.title}"` : 'failed'
    if (name === 'listProjects') summary = `${output?.projects?.length ?? 0} project(s)`
    return <div className="ai-tool-pill ai-tool-pill--done">{label} — {summary}</div>
  }
  return <div className="ai-tool-pill">{label}…</div>
}

// ── AI Assistant panel ──────────────────────────────────────────────────────
function AIAssistantPanel() {
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const busy = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || busy) return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  return (
    <>
      <div className="chat-thread__header">
        <div className="avatar avatar--sm"><Icon name="bot" size={16} label="Assistant" /></div>
        <div>
          <div style={{ fontWeight: 700 }}>AI Assistant</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cl-text-tertiary)' }}>
            Can search &amp; post to your Team Context board
          </div>
        </div>
      </div>

      <div className="chat-thread__messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-main__empty" style={{ flex: 'none' }}>
            <div className="chat-main__empty-icon"><Icon name="sparkle" size={40} /></div>
            <h2 className="chat-main__empty-title">Ask the AI Assistant</h2>
            <p className="chat-main__empty-desc">
              &ldquo;What is the team building right now?&rdquo; · &ldquo;Post a blocker: the payments webhook is flaky&rdquo;
              · &ldquo;Any open projects for a React dev?&rdquo;
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.role === 'user' ? 'chat-message--own' : ''}`}
          >
            <div className={`chat-message__bubble ${message.role === 'user' ? 'chat-message__bubble--own' : 'chat-message__bubble--other'}`}>
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</span>
                }
                if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
                  return <ToolPill key={i} part={part} />
                }
                return null
              })}
            </div>
          </div>
        ))}

        {busy && (
          <div className="chat-message">
            <div className="chat-message__bubble chat-message__bubble--other">⟳ thinking…</div>
          </div>
        )}

        {error && (
          <div className="alert alert--error" style={{ margin: '0 var(--space-xl)' }}>
            Something went wrong. Please try again.
          </div>
        )}
      </div>

      <form className="chat-thread__input" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Ask the AI Assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          id="ai-chat-input"
        />
        <button className="btn btn--primary" type="submit" disabled={busy || !input.trim()} id="ai-chat-send">
          Send
        </button>
      </form>
    </>
  )
}

// ── Project chat panel — real messages, scoped to one project ──────────────
function ProjectChatPanel({ project, currentUserId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    fetch(`/api/projects/${project.id}/messages`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setError(json.error)
        setMessages(json.data || [])
      })
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoading(false))

    const supabase = createClient()
    const channel = supabase
      .channel(`project_messages_${project.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `project_id=eq.${project.id}` },
        (payload) => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [project.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${project.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMessages(prev => prev.some(m => m.id === json.data.id) ? prev : [...prev, json.data])
      setInput('')
    } catch (err) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="chat-thread__header">
        <div className="avatar avatar--sm"><Icon name="file" size={16} label="Project" /></div>
        <div>
          <div style={{ fontWeight: 700 }}>{project.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--cl-text-tertiary)' }}>
            {project.collectives?.name || 'Independent'}
          </div>
        </div>
      </div>

      <div className="chat-thread__messages" ref={scrollRef}>
        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
        ) : messages.length === 0 ? (
          <div className="chat-main__empty" style={{ flex: 'none' }}>
            <div className="chat-main__empty-icon"><Icon name="chat" size={40} /></div>
            <h2 className="chat-main__empty-title">No messages yet</h2>
            <p className="chat-main__empty-desc">Say hello to get the conversation started.</p>
          </div>
        ) : (
          messages.map((m) => {
            const own = m.user_id === currentUserId
            return (
              <div key={m.id} className={`chat-message ${own ? 'chat-message--own' : ''}`}>
                <div className="avatar avatar--sm">{m.avatar_initial || '?'}</div>
                <div className={`chat-message__bubble ${own ? 'chat-message__bubble--own' : 'chat-message__bubble--other'}`}>
                  {!own && <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 2 }}>{m.display_name}</div>}
                  <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                  <div style={{ fontSize: '0.6875rem', opacity: 0.7, marginTop: 2 }}>{relativeTime(m.created_at)}</div>
                </div>
              </div>
            )
          })
        )}

        {error && (
          <div className="alert alert--error" style={{ margin: '0 var(--space-xl)' }}>{error}</div>
        )}
      </div>

      <form className="chat-thread__input" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Message the team…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          id="project-chat-input"
        />
        <button className="btn btn--primary" type="submit" disabled={sending || !input.trim()} id="project-chat-send">
          Send
        </button>
      </form>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [active, setActive] = useState('ai')
  const [projects, setProjects] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id || null))
    fetch('/api/chat/projects')
      .then(r => r.json())
      .then(json => setProjects(json.data || []))
      .catch(() => {})
  }, [])

  const activeProject = projects.find(p => p.id === active)

  return (
    <div className="chat-page">
      <div className="chat-page__sidebar">
        <div className="chat-sidebar__header">
          <h2 className="chat-sidebar__title">Chats</h2>
        </div>

        <button
          className={`chat-sidebar__item ${active === 'ai' ? 'chat-sidebar__item--active' : ''}`}
          onClick={() => setActive('ai')}
          id="chat-nav-ai"
        >
          <div className="avatar avatar--sm"><Icon name="bot" size={16} label="Assistant" /></div>
          <div className="chat-sidebar__item-text">
            <span className="chat-sidebar__item-name">AI Assistant</span>
            <span className="chat-sidebar__item-hint">Always available</span>
          </div>
        </button>

        {projects.length === 0 ? (
          <div className="chat-sidebar__empty">
            <p>No project chats yet</p>
            <span className="chat-sidebar__hint">
              Chats are created automatically when you join a project.
            </span>
          </div>
        ) : (
          projects.map((p) => (
            <button
              key={p.id}
              className={`chat-sidebar__item ${active === p.id ? 'chat-sidebar__item--active' : ''}`}
              onClick={() => setActive(p.id)}
              id={`chat-nav-project-${p.id}`}
            >
              <div className="avatar avatar--sm"><Icon name="file" size={16} label="Project" /></div>
              <div className="chat-sidebar__item-text">
                <span className="chat-sidebar__item-name">{p.title}</span>
                <span className="chat-sidebar__item-hint">{p.collectives?.name || 'Independent'}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="chat-page__main">
        {active === 'ai' ? (
          <AIAssistantPanel />
        ) : activeProject ? (
          <ProjectChatPanel key={activeProject.id} project={activeProject} currentUserId={currentUserId} />
        ) : (
          <div className="chat-main__empty">
            <div className="chat-main__empty-icon"><Icon name="chat" size={40} /></div>
            <h2 className="chat-main__empty-title">Select a project chat</h2>
            <p className="chat-main__empty-desc">
              Your team conversations will appear here. Join a project to start chatting
              with your team members.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
