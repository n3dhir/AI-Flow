import FlowMark from './FlowMark.jsx'
import { timeAgo } from '../lib/time.js'

function StatusDot({ status }) {
  return (
    <span className={`status status--${status}`}>
      <span className="status__dot" />
      <span className="status__label">
        {status === 'online' ? 'backend online' : status === 'connecting' ? 'connecting' : 'offline'}
      </span>
    </span>
  )
}

export default function Sidebar({
  threads,
  activeId,
  status,
  open,
  onClose,
  onSelect,
  onNew,
  onDelete,
  hostName,
}) {
  return (
    <>
      <div className={`sidebar-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="sidebar__brand">
          <FlowMark size={28} />
          <div className="brand-lockup">
            <span className="brand-name">AI&nbsp;Flow</span>
            <span className="brand-sub">local intelligence deck</span>
          </div>
        </div>

        <button className="new-chat" onClick={onNew}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          New conversation
        </button>

        <div className="sidebar__section-label">Threads</div>

        <nav className="thread-list">
          {threads.length === 0 && (
            <p className="thread-list__empty">No conversations yet.<br />Start one — it lands here.</p>
          )}
          {threads.map((t) => (
            <button
              key={t.thread_id}
              className={`thread-item${t.thread_id === activeId ? ' is-active' : ''}`}
              onClick={() => onSelect(t.thread_id)}
              title={t.title}
            >
              <span className="thread-item__rail" />
              <span className="thread-item__title">{t.title || 'Untitled'}</span>
              <span className="thread-item__time">{timeAgo(t.updated_at)}</span>
              <span
                className="thread-item__delete"
                role="button"
                tabIndex={-1}
                aria-label="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(t.thread_id)
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
            </button>
          ))}
        </nav>

        <footer className="sidebar__footer">
          <StatusDot status={status} />
          <span className="footer-meta">{hostName ? `via ${hostName}` : ''}</span>
        </footer>
      </aside>
    </>
  )
}
