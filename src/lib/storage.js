/* ============================================================
   Storage layer — profiles, results, resumable attempts, exam sets, theme
   ทุกอย่างเก็บใน localStorage ของเครื่องผู้ใช้ (ไม่มีการส่งออก)
   ============================================================ */

const K = {
  legacyResults: 'bacc-exam-2569/results/v1',
  legacyName: 'bacc-exam-2569/name',
  profiles: 'bacc2569:profiles',
  current: 'bacc2569:current',
  results: (pid) => `bacc2569:results:${pid}`,
  attempts: (pid) => `bacc2569:attempts:${pid}`,
  sets: 'bacc2569:sets',
  theme: 'bacc2569:theme',
}

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/* ---------------- profiles ---------------- */
export function getProfiles() {
  const list = read(K.profiles, null)
  if (Array.isArray(list)) return list
  return migrateLegacy()
}

function migrateLegacy() {
  const legacy = read(K.legacyResults, [])
  if (!Array.isArray(legacy) || !legacy.length) {
    write(K.profiles, [])
    return []
  }
  const legacyName = (() => {
    try {
      return localStorage.getItem(K.legacyName) || ''
    } catch {
      return ''
    }
  })()
  const profile = {
    id: uid('p'),
    name: legacyName || 'ผู้เข้าสอบ',
    createdAt: new Date().toISOString(),
  }
  write(K.profiles, [profile])
  write(K.current, profile.id)
  if (Array.isArray(legacy) && legacy.length) write(K.results(profile.id), legacy)
  return [profile]
}

export function getCurrentProfile() {
  const profiles = getProfiles()
  if (!profiles.length) return null
  const id = read(K.current, null)
  return profiles.find((p) => p.id === id) || profiles[0]
}

export function setCurrentProfile(id) {
  write(K.current, id)
}

export function createProfile(name) {
  const profiles = getProfiles()
  const profile = {
    id: uid('p'),
    name: (name || 'ผู้เข้าสอบ').trim().slice(0, 60),
    createdAt: new Date().toISOString(),
  }
  write(K.profiles, [...profiles, profile])
  write(K.current, profile.id)
  return profile
}

export function deleteProfile(id) {
  const rest = getProfiles().filter((p) => p.id !== id)
  write(K.profiles, rest)
  try {
    localStorage.removeItem(K.results(id))
    localStorage.removeItem(K.attempts(id))
  } catch {
    /* noop */
  }
  if (rest.length) write(K.current, rest[0].id)
  else {
    try {
      localStorage.removeItem(K.current)
    } catch {
      /* noop */
    }
  }
  return rest
}

export function renameProfile(id, name) {
  const profiles = getProfiles().map((p) =>
    p.id === id ? { ...p, name: (name || p.name).trim().slice(0, 60) } : p,
  )
  write(K.profiles, profiles)
  return profiles.find((p) => p.id === id)
}

/* ---------------- results (ประวัติแยกตามผู้ใช้) ---------------- */
export function loadResults(profileId) {
  const arr = read(K.results(profileId), [])
  return Array.isArray(arr) ? arr : []
}

export function saveResult(profileId, result) {
  const arr = loadResults(profileId)
  arr.unshift(result)
  write(K.results(profileId), arr.slice(0, 60))
}

export function deleteResult(profileId, id) {
  write(
    K.results(profileId),
    loadResults(profileId).filter((r) => r.id !== id),
  )
}

export function clearResults(profileId) {
  try {
    localStorage.removeItem(K.results(profileId))
  } catch {
    /* noop */
  }
}

export function bestFor(partId, results, kind = 'part') {
  const rows = results.filter((r) => (kind === 'set' ? r.setId === partId : r.partId === partId))
  if (!rows.length) return null
  return rows.reduce((best, r) => (r.score > best.score ? r : best), rows[0])
}

/* ---------------- attempts (ทำค้างไว้ ทำต่อได้) ---------------- */
export function loadAttempts(profileId) {
  const obj = read(K.attempts(profileId), {})
  return obj && typeof obj === 'object' ? obj : {}
}

export function getAttempt(profileId, key) {
  return loadAttempts(profileId)[key] || null
}

export function saveAttempt(profileId, attempt) {
  const all = loadAttempts(profileId)
  all[attempt.key] = { ...attempt, updatedAt: new Date().toISOString() }
  write(K.attempts(profileId), all)
}

export function deleteAttempt(profileId, key) {
  const all = loadAttempts(profileId)
  delete all[key]
  write(K.attempts(profileId), all)
}

export function listAttempts(profileId) {
  return Object.values(loadAttempts(profileId))
    .filter((a) => a.status !== 'done')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

/* ---------------- exam sets (ใช้ร่วมกันได้ ประวัติแยก) ---------------- */
export function getSets() {
  const arr = read(K.sets, [])
  return Array.isArray(arr) ? arr : []
}

export function saveSet(set) {
  const arr = getSets().filter((s) => s.id !== set.id)
  arr.unshift(set)
  write(K.sets, arr.slice(0, 40))
  return set
}

export function deleteSet(id) {
  write(
    K.sets,
    getSets().filter((s) => s.id !== id),
  )
}

export const makeShareCode = (set) => {
  const payload = { s: set.seed, n: set.name, z: set.sizeKey }
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } catch {
    return ''
  }
}

export const parseShareCode = (code) => {
  try {
    const clean = String(code).trim().replace(/-/g, '+').replace(/_/g, '/')
    const pad = clean + '='.repeat((4 - (clean.length % 4)) % 4)
    const json = decodeURIComponent(escape(atob(pad)))
    const data = JSON.parse(json)
    if (!data || !data.s) return null
    return { seed: String(data.s), name: String(data.n || 'ชุดข้อสอบที่แชร์'), sizeKey: data.z === 'mini' ? 'mini' : 'official' }
  } catch {
    return null
  }
}

/* ---------------- theme ---------------- */
export function getTheme() {
  try {
    const t = localStorage.getItem(K.theme)
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* noop */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

export function setTheme(theme) {
  try {
    localStorage.setItem(K.theme, theme)
  } catch {
    /* noop */
  }
}

/* ---------------- helpers ---------------- */
export const formatThaiDate = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
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
  const s = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export const humanTime = (sec = 0) => {
  const s = Math.max(0, Math.round(sec))
  if (s < 60) return `${s} วินาที`
  const m = Math.floor(s / 60)
  const rest = s % 60
  if (m < 60) return rest ? `${m} นาที ${rest} วินาที` : `${m} นาที`
  return `${Math.floor(m / 60)} ชั่วโมง ${m % 60} นาที`
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

export const uidPublic = uid
