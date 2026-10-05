'use client'

import './chat.css'

export default function ChatPage() {
  return (
    <div className="chat-page">
      <div className="chat-page__sidebar">
        <div className="chat-sidebar__header">
          <h2 className="chat-sidebar__title">Project Chats</h2>
        </div>
        <div className="chat-sidebar__empty">
          <p>No project chats yet</p>
          <span className="chat-sidebar__hint">
            Chats are created automatically when you join a project.
          </span>
        </div>
      </div>
      <div className="chat-page__main">
        <div className="chat-main__empty">
          <div className="chat-main__empty-icon">💬</div>
          <h2 className="chat-main__empty-title">Select a project chat</h2>
          <p className="chat-main__empty-desc">
            Your team conversations will appear here. Join a project to start chatting 
            with your collective members.
          </p>
        </div>
      </div>
    </div>
  )
}
