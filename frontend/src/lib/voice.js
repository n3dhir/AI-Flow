const BASE = import.meta.env.VITE_API_BASE ?? ''

// NOTE: TOKEN_KEY ('aiflow.token') mirrors lib/api.js — keep in sync.
function authHeaders() {
  const token = localStorage.getItem('aiflow.token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseVoiceError(res) {
  let detail = `HTTP ${res.status}`
  try {
    const body = await res.json()
    if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
  } catch {
    /* not json */
  }
  const err = new Error(detail)
  err.status = res.status
  return err
}

export function pickRecordingMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m
    } catch {
      /* ignore */
    }
  }
  return ''
}

const BLOB_EXT = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/flac': 'flac',
}

export async function transcribeAudio({ blob, threadId, signal }) {
  const ext = BLOB_EXT[(blob.type || '').split(';')[0]] || 'webm'
  const form = new FormData()
  form.append('audio', blob, `recording.${ext}`)
  form.append('thread_id', threadId)
  const res = await fetch(`${BASE}/api/stt`, {
    method: 'POST',
    body: form,
    headers: authHeaders(),
    signal,
  })
  if (!res.ok) throw await parseVoiceError(res)
  const data = await res.json()
  return data.transcript || ''
}

export function formatRecTime(totalSecs) {
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
