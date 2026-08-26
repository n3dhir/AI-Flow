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
    <div className="composer-wrap">
      {upload && (
        <div className={`upload-chip upload-chip--${upload.state}`}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            {upload.state === 'done' ? (
              <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M12.5 7a5.5 5.5 0 1 1-1.6-3.9M12.5 2v3.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={upload.state === 'uploading' ? 'spin' : ''} />
            )}
          </svg>
          <span className="upload-chip__name">{upload.name}</span>
          <span className="upload-chip__state">
            {upload.state === 'uploading' && 'indexing…'}
            {upload.state === 'done' && `indexed · ${upload.chunks} chunks`}
            {upload.state === 'error' && 'failed'}
          </span>
        </div>
      )}

      <div className="composer">
        <button
          className="icon-btn"
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
        />

        {streaming ? (
          <button className="send send--stop" title="Stop (Esc)" onClick={onStop}>
            <span className="stop-square" />
          </button>
        ) : (
          <button className="send" title="Send (Enter)" onClick={submit} disabled={!value.trim()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 8h11M9 3.5L13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="composer-hint">
        <kbd>Enter</kbd> send · <kbd>Shift+Enter</kbd> newline{streaming && <> · <kbd>Esc</kbd> stop</>}
      </div>
    </div>
  )
})

export default Composer
