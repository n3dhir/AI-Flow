import FlowMark from './FlowMark.jsx'
import { shortId } from '../lib/time.js'

export default function ChatHeader({ threadId, status, modelName, hostName, onToggleSidebar }) {
  const displayModel = modelName
    ? modelName.includes('/')
      ? modelName.split('/').pop()
      : modelName
    : '…'

  const dotColors = {
    online: 'bg-accent shadow-[0_0_7px_var(--color-accent-glow)]',
    connecting: 'bg-amber animate-pulse',
    offline: 'bg-danger',
  }

  return (
    <header className="flex items-center gap-3 h-14 px-4 border-b border-hairline bg-[rgba(10,13,18,0.72)] backdrop-blur-[10px] z-10 animate-drop">
      <button
        className="grid place-items-center w-[34px] h-[34px] rounded-lg text-text-dim hover:bg-white/[0.05] hover:text-text transition-colors"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1.5 3h13M1.5 8h13M1.5 13h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex items-center gap-2 font-mono text-[11.5px] tracking-wide px-3 py-1.5 border border-hairline rounded-full bg-white/[0.02]">
        <FlowMark size={16} animated={false} />
        <span className="text-accent">{displayModel}</span>
        <span className="text-text-faint">/</span>
        <span className="text-text-dim">{hostName || 'llm'}</span>
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-[7px] font-mono text-[10.5px] text-text-faint tracking-wide" title="Current thread id">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
        thread&nbsp;<code className="text-text-dim">{threadId ? shortId(threadId) : '——'}</code>
      </div>
    </header>
  )
}
