import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const Composer = forwardRef(function Composer(
  { value, onValueChange, streaming, upload, onSend, onStop, onPickFile },
  ref
) {
  const textareaRef = useRef(null)
  const fileRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }))

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [value])

  useEffect(() => {
    if (!streaming) textareaRef.current?.focus()
  }, [streaming])

  const submit = () => {
    const text = value.trim()
    if (!text || streaming) return
    onSend(text)
    onValueChange('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Escape' && streaming) onStop()
  }

  return (
    <>
    <div className="py-2.5 px-5 md:py-2.5 md:px-5.5 pb-4">
      {upload && (
        <div className={`inline-flex items-center gap-2 mb-2 ml-1 py-1.5 px-[11px] border rounded-[9px] bg-elevated font-mono text-[11px] animate-rise ${upload.state === 'done' ? 'border-hairline text-accent' : upload.state === 'error' ? 'border-danger/40 text-danger' : 'border-hairline'}`}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            {upload.state === 'done' ? (
              <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M12.5 7a5.5 5.5 0 1 1-1.6-3.9M12.5 2v3.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={upload.state === 'uploading' ? 'animate-spin' : ''} />
            )}
          </svg>
          <span className="max-w-[220px] truncate">{upload.name}</span>
          <span className={upload.state === 'done' ? 'text-accent' : upload.state === 'error' ? 'text-danger' : 'text-text-faint'}>
            {upload.state === 'uploading' && 'indexing…'}
            {upload.state === 'done' && `indexed · ${upload.chunks} chunks`}
            {upload.state === 'error' && 'failed'}
          </span>
        </div>
      )}

      <div className="flex items-end gap-[7px] max-w-[764px] mx-auto py-2 px-1.5 md:py-2 md:px-2 bg-elevated border border-hairline-strong rounded-[18px] transition-all focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_rgba(92,232,197,0.08),0_12px_34px_-18px_rgba(92,232,197,0.25)]">
        <button
          className="grid place-items-center w-[37px] h-[37px] rounded-xl text-text-faint hover:text-accent hover:bg-accent-dim transition-all disabled:opacity-40 disabled:cursor-default shrink-0"
          title="Upload document (PDF, DOCX, TXT, MD, PY, CSV)"
          onClick={() => fileRef.current?.click()}
          disabled={upload?.state === 'uploading'}
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M15.4 8.6l-6.1 6.1a4.2 4.2 0 0 1-6-6l6.6-6.6a2.8 2.8 0 0 1 4 4l-6.6 6.6a1.4 1.4 0 0 1-2-2l6.1-6.1"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.py,.csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickFile(file)
            e.target.value = ''
          }}
        />

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask anything — or attach a document…"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 resize-none bg-transparent text-text text-[14.8px] leading-relaxed py-[9px] px-1 max-h-[168px] outline-none placeholder:text-text-faint"
        />

        {streaming ? (
          <button
            className="grid place-items-center w-[38px] h-[38px] rounded-[13px] border border-danger/55 shrink-0"
            title="Stop (Esc)"
            onClick={onStop}
          >
            <span className="w-[11px] h-[11px] rounded-[2.5px] bg-danger animate-pulse" />
          </button>
        ) : (
          <button
            className="grid place-items-center w-[38px] h-[38px] rounded-[13px] bg-accent text-[#07271f] shrink-0 transition-all hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-6px_var(--color-accent-glow)] disabled:bg-white/[0.07] disabled:text-text-faint disabled:cursor-default disabled:translate-y-0 disabled:shadow-none"
            title="Send (Enter)"
            onClick={submit}
            disabled={!value.trim()}
          >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 8h11M9 3.5L13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[764px] mx-auto mt-2.5 text-center font-mono text-[10px] tracking-wide text-text-faint">
        <kbd className="px-[5px] py-px border border-hairline rounded-[5px] bg-white/[0.03] border-b-2">Enter</kbd> send · <kbd className="px-[5px] py-px border border-hairline rounded-[5px] bg-white/[0.03] border-b-2">Shift+Enter</kbd> newline{streaming && <> · <kbd className="px-[5px] py-px border border-hairline rounded-[5px] bg-white/[0.03] border-b-2">Esc</kbd> stop</>}
      </div>
    </>
  )
})

export default Composer
