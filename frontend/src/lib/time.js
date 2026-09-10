export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function clockTime(iso) {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function shortId(id) {
  if (!id) return ''
  return id.slice(0, 8)
}
