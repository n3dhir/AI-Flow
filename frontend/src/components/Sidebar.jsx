import { useEffect, useState } from 'react'
import FlowMark from './FlowMark.jsx'
import { timeAgo } from '../lib/time.js'

function StatusDot({ status }) {
  const colors = {
    online: 'bg-accent shadow-[0_0_8px_var(--color-accent-glow)]',
    connecting: 'bg-amber animate-pulse',
    offline: 'bg-danger',
  }
  const labels = {
    online: 'backend online',
    connecting: 'connecting',
    offline: 'offline',
  }
  const textColors = {
    online: 'text-accent',
    connecting: 'text-amber',
    offline: 'text-danger',
  }

  return (
    <span className="flex items-center gap-2 font-mono text-[11px]">
      <span className={`w-[7px] h-[7px] rounded-full ${colors[status]}`} />
      <span className={textColors[status]}>{labels[status]}</span>
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
  onLogout,
  hostName,
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])
    return <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(4,6,10,0.55)] md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`w-[274px] shrink-0 flex-col bg-panel border-r border-hairline z-40 ${open ? 'flex' : 'hidden'} fixed top-0 bottom-0 left-0 md:relative md:z-auto`}>
        <div className="flex items-center gap-[11px] pt-5 pb-3.5 px-[18px] animate-rise">
          <FlowMark size={28} />
          <div className="flex flex-col leading-[1.15]">
            <span className="font-display italic text-[23px] tracking-wide">AI&nbsp;Flow</span>
            <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-text-faint">local intelligence deck</span>
          </div>
        </div>

        <button
          className="flex items-center gap-2.5 mx-3.5 mt-1.5 mb-1 py-2.5 px-3.5 border border-hairline-strong rounded-xl text-text-dim text-[13.5px] font-medium tracking-wide transition-all hover:border-accent-glow hover:text-accent hover:bg-accent-dim hover:-translate-y-px animate-rise"
          onClick={onNew}
          title="New conversation (Ctrl/Cmd+N)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          New conversation
        </button>

        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-faint mt-[18px] mx-5 mb-2">Threads</div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
          {threads.length === 0 && (
            <p className="mx-2.5 my-3.5 text-[13px] leading-relaxed text-text-faint">No conversations yet.<br />Start one — it lands here.</p>
          )}
          {threads.map((t, i) => (
            <button
              key={t.thread_id}
              className={`group relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 w-full py-2.5 px-2.5 rounded-[10px] text-left transition-colors hover:bg-white/[0.04] animate-rise ${t.thread_id === activeId ? 'bg-accent-dim' : ''}`}
              style={{ animationDelay: `${0.16 + i * 0.05}s` }}
              onClick={() => onSelect(t.thread_id)}
              title={t.title}
            >
              <span className={`w-[3px] h-4 rounded-sm transition-colors ${(t.thread_id === activeId) ? 'bg-accent' : 'bg-transparent'}`} />
              <span className={`text-[13.5px] truncate ${t.thread_id === activeId ? 'text-text' : 'text-text-dim'}`}>{t.title || 'Untitled'}</span>
              <span className="font-mono text-[10px] text-text-faint">{timeAgo(t.updated_at)}</span>
              <span
                className="grid place-items-center w-5 h-5 rounded-md text-text-faint opacity-0 hover:text-danger hover:bg-danger/10 transition-all group-hover:opacity-100"
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

        <footer className="border-t border-hairline py-3 px-[18px] flex flex-col gap-1.5 animate-fade">
          <StatusDot status={status} />
          <span className="font-mono text-[10px] tracking-wide text-text-faint">{hostName ? `via ${hostName}` : ''}</span>
          <button className="absolute right-4 bottom-4 text-text-faint hover:text-text transition-colors" onClick={onLogout} title="Sign out">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2M7 9l3-3-3-3M10 6H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </footer>
      </aside>
    </>
  
}
