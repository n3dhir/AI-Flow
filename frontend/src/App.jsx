import { useCallback, useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import Sidebar from './components/Sidebar.jsx'
import ChatHeader from './components/ChatHeader.jsx'
import Message from './components/Message.jsx'
import Composer from './components/Composer.jsx'
import EmptyState from './components/EmptyState.jsx'
import Toasts from './components/Toasts.jsx'
import Login from './components/Login.jsx'
import { listConversations, getMessages, deleteConversation, uploadDocument, streamChat, getModel, getToken, logout, getMe } from './lib/api.js'
import { transcribeAudio, pickRecordingMime } from './lib/voice.js'

const THREAD_KEY = 'aiflow.activeThread'
const MAX_REC_SECS = 120

let toastSeq = 0

function HistorySkeleton() {
  return (
    <div className="max-w-[764px] mx-auto pt-10 px-5 pb-4 flex flex-col gap-3.5" aria-hidden="true">
      <div className="h-[15px] rounded-[7px] bg-gradient-to-r from-white/5 via-white/10 to-[length:240%_100%] animate-[shimmer_1.5s_linear_infinite] w-[60%]" />
      <div className="h-[15px] rounded-[7px] bg-gradient-to-r from-white/5 via-white/10 to-[length:240%_100%] animate-[shimmer_1.5s_linear_infinite] w-[40%]" />
      <div className="h-[15px] rounded-[7px] bg-gradient-to-r from-white/5 via-white/10 to-[length:240%_100%] animate-[shimmer_1.5s_linear_infinite] w-[72%]" />
    </div>
  )
}

export default function App() {
  const [booted, setBooted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem(THREAD_KEY) || null)
  const [messages, setMessages] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [status, setStatus] = useState('connecting')
  const [streaming, setStreaming] = useState(false)
  const [upload, setUpload] = useState(null)
  const [toasts, setToasts] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [draft, setDraft] = useState('')
  const [modelName, setModelName] = useState('')
  const [recState, setRecState] = useState('idle') // idle | recording | transcribing
  const [recSecs, setRecSecs] = useState(0)
  const hostLabel = modelName.includes('gemini') ? 'google ai' : modelName ? 'frellmapi' : ''

  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const stickRef = useRef(true)
  const composerRef = useRef(null)
  const recRef = useRef(null)
  const lastMsg = messages[messages.length - 1]
  const [canRetry, setCanRetry] = useState(false)

  useEffect(() => {
    if (streaming) return
    const isEmpty = lastMsg?.role === 'assistant' && !lastMsg.content.trim()
    const hasToolError = lastMsg?.tools?.some((t) => t.status === 'error')
    setCanRetry(isEmpty || hasToolError)
  }, [messages, streaming, lastMsg])

  const handleAuth = useCallback(() => {
    setAuthenticated(true)
    setAuthChecking(false)
  }, [])

  const handleLogout = useCallback(() => {
    posthog.capture('user_logged_out')
    posthog.reset()
    logout()
    setAuthenticated(false)
    setThreads([])
    setMessages([])
    setActiveId(null)
    localStorage.removeItem(THREAD_KEY)
  }, [])

  useEffect(() => {
    if (getToken()) {
      getMe()
        .then((me) => {
          setAuthenticated(true)
          const userId = me?.user_id ?? me?.id ?? me?.sub
          if (userId) {
            posthog.identify(String(userId), { email: me?.email })
          }
        })
        .catch(() => {
          logout()
          setAuthenticated(false)
        })
        .finally(() => setAuthChecking(false))
    } else {
      setAuthChecking(false)
    }
  }, [])

  const toast = useCallback((message, kind = 'info', ttl = 4500) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl)
  }, [])

  const refreshThreads = useCallback(async () => {
    try {
      const data = await listConversations()
      setThreads(Array.isArray(data) ? data : [])
      setStatus('online')
      return data
    } catch {
      setStatus('offline')
      return []
    }
  }, [])

  const loadHistory = useCallback(async (id) => {
    if (!id) {
      setMessages([])
      return
    }
    setHistoryLoading(true)
    try {
      const data = await getMessages(id)
      const clean = data
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m, i) => ({ id: `${m.created_at}-${i}`, role: m.role, content: m.content, tools: m.tools || [], ts: m.created_at }))
      setMessages(clean)
      stickRef.current = true
    } catch {
      setMessages([])
      toast('Could not load conversation history.', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setBooted(true))
    refreshThreads().then((data) => {
      const stored = localStorage.getItem(THREAD_KEY)
      if (stored && data.some((t) => t.thread_id === stored)) {
        loadHistory(stored)
      } else if (stored) {
        localStorage.removeItem(THREAD_KEY)
        setActiveId(null)
      }
    })
    getModel().then((d) => setModelName(d.model)).catch(() => {})
    return () => raf && cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (authenticated) {
      refreshThreads()
    }
  }, [authenticated])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140
  }

  const selectThread = (id) => {
    if (id === activeId) {
      return
    }
    posthog.capture('conversation_selected', { thread_id: id })
    setActiveId(id)
    localStorage.setItem(THREAD_KEY, id)
    loadHistory(id)
  }

  const startNew = () => {
    cancelRecording()
    abortRef.current?.abort()
    setActiveId(null)
    localStorage.removeItem(THREAD_KEY)
    setMessages([])
    setDraft('')
    if (window.innerWidth < 768) setSidebarOpen(false)
    composerRef.current?.focus()
  }

  const removeThread = async (id) => {
    setThreads((t) => t.filter((x) => x.thread_id !== id))
    if (id === activeId) startNew()
    try {
      await deleteConversation(id)
      posthog.capture('conversation_deleted', { thread_id: id })
      toast('Conversation deleted.')
    } catch {
      toast('Delete failed on server.', 'error')
    }
  }

  const ensureThreadId = () => {
    let tid = activeId
    if (!tid) {
      tid = crypto.randomUUID()
      posthog.capture('conversation_created', { thread_id: tid })
      setActiveId(tid)
      localStorage.setItem(THREAD_KEY, tid)
    }
    return tid
  }

  const send = async (text) => {
    if (streaming) return null
    const tid = ensureThreadId()
    const stamp = Date.now()
    const userMsg = { id: `u-${stamp}`, role: 'user', content: text, ts: new Date().toISOString() }
    const botMsg = { id: `a-${stamp}`, role: 'assistant', content: '', ts: new Date().toISOString(), tools: [] }

    setMessages((m) => [...m, userMsg, botMsg])
    stickRef.current = true
    setStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const patchBot = (fn) =>
      setMessages((prev) => prev.map((msg) => (msg.id === botMsg.id ? fn(msg) : msg)))

    const append = (delta) => patchBot((msg) => ({ ...msg, content: msg.content + delta }))

    const onEvent = (evt) => {
      if (evt.type === 'tool_start') {
        patchBot((msg) => ({
          ...msg,
          tools: [...(msg.tools || []), { name: evt.name, status: 'running' }],
        }))
      } else if (evt.type === 'tool_end') {
        patchBot((msg) => {
          const tools = [...(msg.tools || [])]
          const idx = tools.findIndex((t) => t.status === 'running')
          if (idx >= 0) tools[idx] = { ...tools[idx], status: evt.ok ? 'done' : 'error', preview: evt.preview }
          return { ...msg, tools }
        })
      }
    }

    posthog.capture('message_sent', { thread_id: tid, message_length: text.length })
    let reply = null
    try {
      reply = await streamChat({ threadId: tid, message: text, signal: ctrl.signal, onDelta: append, onEvent })
    } catch (e) {
      if (e.name === 'AbortError') {
        append('\n\n_(stopped)_')
      } else if (e.message.includes('Session expired')) {
        handleLogout()
      } else {
        const failed = e.status ? `${e.message}` : `Cannot reach backend — ${e.message}`
        posthog.capture('chat_error', { thread_id: tid, error_message: failed })
        posthog.captureException(e)
        setMessages((prev) =>
          prev.map((msg) => (msg.id === botMsg.id && !msg.content.trim() ? { ...msg, content: `⚠️ ${failed}` } : msg))
        )
        toast(failed, 'error')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setMessages((prev) =>
        prev.map((msg) => (msg.id === botMsg.id && !msg.content.trim() ? { ...msg, content: '_No response._' } : msg))
      )
      refreshThreads()
    }
    return reply
  }

  const retry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      posthog.capture('message_retried', { thread_id: activeId })
      send(lastUserMsg.content)
    }
  }

  const stop = () => {
    cancelRecording()
    posthog.capture('message_stopped', { thread_id: activeId })
    abortRef.current?.abort()
  }

  const cancelRecording = () => {
    const r = recRef.current
    if (!r) return
    clearInterval(r.timer)
    try {
      r.recorder.onstop = null
      if (r.recorder.state !== 'inactive') r.recorder.stop()
    } catch {
      /* already stopped */
    }
    r.stream.getTracks().forEach((t) => t.stop())
    recRef.current = null
    setRecState('idle')
    setRecSecs(0)
  }

  const startRecording = async () => {
    if (recState !== 'idle' || streaming) return
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      toast('Microphone needs HTTPS or localhost.', 'error')
      return
    }
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast('Voice recording is not supported in this browser.', 'error')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickRecordingMime()
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data)
      }
      const startedAt = Date.now()
      const timer = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAt) / 1000)
        setRecSecs(secs)
        if (secs >= MAX_REC_SECS) stopRecordingAndSend(false)
      }, 500)
      recRef.current = { stream, recorder, chunks, timer, startedAt }
      recorder.start(200)
      setRecSecs(0)
      setRecState('recording')
      posthog.capture('voice_recording_started', { thread_id: activeId })
    } catch {
      toast('Microphone access denied. Allow mic permission and try again.', 'error')
      posthog.capture('voice_recording_failed', { reason: 'mic_denied' })
    }
  }

  const stopRecordingAndSend = async (cancelled = false) => {
    const r = recRef.current
    if (!r) return
    clearInterval(r.timer)
    const secs = Math.floor((Date.now() - r.startedAt) / 1000)
    const blob = await new Promise((resolve) => {
      r.recorder.onstop = () => resolve(new Blob(r.chunks, { type: r.recorder.mimeType || 'audio/webm' }))
      try {
        r.recorder.stop()
      } catch {
        resolve(new Blob([]))
      }
    })
    r.stream.getTracks().forEach((t) => t.stop())
    recRef.current = null
    setRecState('idle')
    setRecSecs(0)
    posthog.capture('voice_recording_stopped', { duration_s: secs, cancelled })
    if (cancelled) return
    if (!blob.size || secs < 1) {
      toast('Recording too short — hold the mic button while speaking.', 'error')
      return
    }
    const tid = ensureThreadId()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRecState('transcribing')
    try {
      const transcript = await transcribeAudio({ blob, threadId: tid, signal: ctrl.signal })
      posthog.capture('voice_transcribed', { thread_id: tid, chars: transcript.length })
      if (!transcript.trim()) {
        toast('Could not understand the recording. Try again.', 'error')
        return
      }
      // Place transcript in the composer for review/edit — user sends manually.
      setDraft(transcript.trim())
      composerRef.current?.focus()
    } catch (e) {
      if (e.name === 'AbortError') return
      posthog.capture('voice_transcribe_failed', { error_message: e.message })
      toast(e.status ? e.message : `Cannot reach backend — ${e.message}`, 'error')
    } finally {
      setRecState('idle')
      if (abortRef.current === ctrl) abortRef.current = null
    }
  }

  const pickFile = async (file) => {
    if (upload?.state === 'uploading') return
    const tid = ensureThreadId()
    setUpload({ name: file.name, state: 'uploading' })
    try {
      const res = await uploadDocument(tid, file)
      posthog.capture('document_uploaded', { thread_id: tid, chunks: res.chunks, file_type: file.name.split('.').pop() })
      setUpload({ name: file.name, state: 'done', chunks: res.chunks })
      toast(`Indexed "${res.filename}" · ${res.chunks} chunks`, 'success')
      setTimeout(() => setUpload(null), 4000)
      refreshThreads()
    } catch (e) {
      posthog.capture('document_upload_failed', { thread_id: tid, file_type: file.name.split('.').pop(), error_message: e.message })
      posthog.captureException(e)
      setUpload({ name: file.name, state: 'error' })
      toast(e.message || 'Upload failed.', 'error')
      setTimeout(() => setUpload(null), 3200)
    }
  }

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-full h-full bg-bg">
        <div className="font-display text-2xl text-accent">AI Flow</div>
      </div>
    )
  }

  if (!authenticated) {
    return <Login onAuth={handleAuth} />
  }

  return (
    <div className="relative flex h-dvh">
      {/* Shared gradient defs - always in DOM */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="flowgrad" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5ce8c5" />
            <stop offset="1" stopColor="#9db8ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-0 left-0 right-0 h-[2px] z-[60] bg-gradient-to-r from-transparent via-accent/70 to-[length:220%_100%] animate-flow" aria-hidden="true" />

      <Sidebar
        threads={threads}
        activeId={activeId}
        status={status}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={selectThread}
        onNew={startNew}
        onDelete={removeThread}
        onLogout={handleLogout}
        hostName={hostLabel}
      />

      <main className="relative flex-1 min-w-0 flex flex-col bg-bg">
        <ChatHeader threadId={activeId} status={status} modelName={modelName} hostName={hostLabel} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <div className="relative flex-1 overflow-y-auto" ref={scrollRef} onScroll={onScroll}>
          {historyLoading ? (
            <HistorySkeleton />
          ) : messages.length === 0 ? (
            <EmptyState
              onPick={(prompt) => {
                setDraft(prompt)
                composerRef.current?.focus()
              }}
            />
          ) : (
            <div className="max-w-[764px] mx-auto py-[34px] px-5.5 flex flex-col gap-[26px]">
              {messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  streaming={streaming && m.role === 'assistant' && m === messages[messages.length - 1]}
                  canRetry={canRetry && m === messages[messages.length - 1]}
                  onRetry={retry}
                />
              ))}
            </div>
          )}
        </div>

        <Composer
          ref={composerRef}
          value={draft}
          onValueChange={setDraft}
          streaming={streaming}
          upload={upload}
          onSend={send}
          onStop={stop}
          onPickFile={pickFile}
          recState={recState}
          recSecs={recSecs}
          onMicStart={startRecording}
          onMicStop={() => stopRecordingAndSend(false)}
          onMicCancel={() => stopRecordingAndSend(true)}
        />
      </main>

      <Toasts toasts={toasts} />
    </div>
  )
}
