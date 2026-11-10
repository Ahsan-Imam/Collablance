'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import './chat.css'

// ── Tool call pill — compact, generic rendering for any tool part ──────────
function ToolPill({ part }) {
  const name = part.type.startsWith('tool-') ? part.type.slice(5) : part.toolName
  const labels = {
    searchTeamContext: '🔍 Searching team context',
    postTeamContext: '📝 Posting to team context',
    listProjects: '📁 Looking up projects',
  }
  const label = labels[name] || `🔧 ${name}`

  if (part.state === 'output-error') {
    return <div className="ai-tool-pill ai-tool-pill--error">⚠️ {label} failed: {part.errorText}</div>
  }
  if (part.state === 'output-available') {
    let summary = ''
    if (name === 'searchTeamContext') summary = `${part.output?.results?.length ?? 0} result(s)`
    if (name === 'postTeamContext') summary = part.output?.posted ? `"${part.output.card?.title}"` : 'failed'
    if (name === 'listProjects') summary = `${part.output?.projects?.length ?? 0} project(s)`
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
        <div className="avatar avatar--sm">🤖</div>
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
            <div className="chat-main__empty-icon">✨</div>
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
            ⚠️ Something went wrong. Please try again.
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [active, setActive] = useState('ai')

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
          <div className="avatar avatar--sm">🤖</div>
          <div className="chat-sidebar__item-text">
            <span className="chat-sidebar__item-name">AI Assistant</span>
            <span className="chat-sidebar__item-hint">Always available</span>
          </div>
        </button>

        <div className="chat-sidebar__empty">
          <p>No project chats yet</p>
          <span className="chat-sidebar__hint">
            Chats are created automatically when you join a project.
          </span>
        </div>
      </div>

      <div className="chat-page__main">
        {active === 'ai' ? (
          <AIAssistantPanel />
        ) : (
          <div className="chat-main__empty">
            <div className="chat-main__empty-icon">💬</div>
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
