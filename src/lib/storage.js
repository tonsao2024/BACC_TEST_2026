const KEY = 'bacc-exam-2569/results/v1'
const NAME_KEY = 'bacc-exam-2569/name'

export function loadResults() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveResult(result) {
  try {
    const arr = loadResults()
    arr.unshift(result)
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 60)))
  } catch {
    /* storage unavailable */
  }
}

export function clearResults() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function bestFor(partId, results) {
  const rows = results.filter((r) => r.partId === partId)
  if (!rows.length) return null
  return rows.reduce((best, r) => (r.score > best.score ? r : best), rows[0])
}

export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* noop */
  }
}

export const formatThaiDate = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatThaiDateTime = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
}

export const mmss = (sec) => {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
