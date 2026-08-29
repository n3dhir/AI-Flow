export default function Toasts({ toasts }) {
  if (!toasts.length) return null

  const borderColors = {
    success: 'border-l-accent',
    error: 'border-l-danger',
    info: 'border-l-blue',
  }

  return (
    <div className="fixed right-[18px] bottom-[18px] flex flex-col gap-2 z-50" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-[340px] py-[11px] px-[15px] bg-raise border border-hairline-strong border-l-[3px] rounded-[11px] text-[13px] text-text shadow-[0_16px_44px_-14px_rgba(0,0,0,0.65)] animate-[toastIn_0.3s_cubic-bezier(0.22,0.9,0.3,1)_both] ${borderColors[t.kind]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
