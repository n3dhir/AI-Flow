export default function ToolTrail({ tools }) {
  if (!tools?.length) return null

  const statusStyles = {
    running: 'border-hairline',
    done: 'border-hairline',
    error: 'border-hairline',
  }

  const dotStyles = {
    running: 'bg-amber animate-pulse',
    done: 'bg-accent shadow-[0_0_6px_var(--color-accent-glow)]',
    error: 'bg-danger',
  }

  const textStyles = {
    running: 'text-amber',
    done: 'text-accent-deep',
    error: 'text-danger',
  }

  return (
    <div className="flex flex-col gap-1.5 mb-3">
      {tools.map((t, i) => (
        <div key={`${t.name}-${i}`} className={`flex items-center gap-[9px] w-fit max-w-full py-[5px] px-[11px] border rounded-lg bg-white/[0.02] font-mono text-[11px] animate-rise ${statusStyles[t.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[t.status]}`} aria-hidden="true" />
          <span className="text-text">{t.name}</span>
          <span className={textStyles[t.status]}>
            {t.status === 'running' && 'running…'}
            {t.status === 'done' && 'done'}
            {t.status === 'error' && 'failed'}
          </span>
          {t.preview && (
            <span className="text-text-faint truncate max-w-[300px] pl-0.5" title={t.preview}>
              <span className="text-text-faint">· </span>{t.preview}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
