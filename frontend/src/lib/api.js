const BASE = import.meta.env.VITE_API_BASE ?? ''

const TOKEN_KEY = 'aiflow.token'
const REFRESH_KEY = 'aiflow.refresh'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_KEY)
  }
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await fetch(`${BASE}/api/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    setToken(null)
    setRefreshToken(null)
    throw new Error('Refresh failed')
  }

  const data = await res.json()
  setToken(data.access_token)
  setRefreshToken(data.refresh_token)
  return data.access_token
}

async function parseError(res) {
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

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(path, options = {}) {
  let res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  })

  if (res.status === 401 && !path.includes('/refresh') && !path.includes('/login')) {
    try {
      const newToken = await refreshAccessToken()
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      })
    } catch (e) {
      setToken(null)
      setRefreshToken(null)
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function register(email, password) {
  const data = await apiFetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  setToken(data.access_token)
  setRefreshToken(data.refresh_token)
  return data
}

export async function login(email, password) {
  const data = await apiFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  setToken(data.access_token)
  setRefreshToken(data.refresh_token)
  return data
}

export async function logout() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    await fetch(`${BASE}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {})
  }
  setToken(null)
  setRefreshToken(null)
}

export async function getMe() {
  return apiFetch('/api/me')
}

export async function getModel() {
  return apiFetch('/api/model')
}

export async function listConversations() {
  return apiFetch('/api/conversations')
}

export async function getMessages(threadId) {
  return apiFetch(`/api/conversations/${encodeURIComponent(threadId)}/messages`)
}

export async function deleteConversation(threadId) {
  const res = await fetch(`${BASE}/api/conversations/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 404) throw await parseError(res)
}

export async function uploadDocument(threadId, file) {
  const form = new FormData()
  form.append('file', file)
  form.append('thread_id', threadId)
  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    body: form,
    headers: authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function streamChat({ threadId, message, signal, onDelta, onEvent }) {
  let res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ thread_id: threadId, message }),
    signal,
  })

  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken()
      res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body: JSON.stringify({ thread_id: threadId, message }),
        signal,
      })
    } catch (e) {
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!res.ok) throw await parseError(res)

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = await res.json()
    const reply = data.reply ?? data.content ?? ''
    if (reply) onDelta(reply)
    return reply
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const evt = JSON.parse(payload)

          if (evt.tool_start) {
            onEvent?.({ type: 'tool_start', name: evt.tool_start.name })
            continue
          }
          if (evt.tool_end) {
            onEvent?.({
              type: 'tool_end',
              name: evt.tool_end.name,
              ok: evt.tool_end.ok !== false,
              preview: evt.tool_end.preview || '',
            })
            continue
          }

          const delta = evt.delta ?? evt.token ?? evt.content ?? ''
          if (delta) {
            full += delta
            onDelta(delta)
          }
        } catch {
          /* keepalive or malformed line */
        }
      }
    }
  }

  return full
}
