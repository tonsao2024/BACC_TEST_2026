/* ============================================================
   Storage layer — profiles, results, resumable attempts, exam sets, theme, settings
   เก็บสำเนาใน localStorage เพื่อให้ใช้งานออฟไลน์ได้ และซิงก์ขึ้น GitHub (ดู remote.js)
   ============================================================ */

const K = {
  legacyResults: 'bacc-exam-2569/results/v1',
  legacyName: 'bacc-exam-2569/name',
  profiles: 'bacc2569:profiles',
  current: 'bacc2569:current',
  results: (pid) => `bacc2569:results:${pid}`,
  attempts: (pid) => `bacc2569:attempts:${pid}`,
  sets: 'bacc2569:sets',
  qbank: 'bacc2569:qbank',
  theme: 'bacc2569:theme',
  settings: 'bacc2569:settings',
}

// Each authenticated account has a separate local cache; legacy keys are left untouched.
let storageScope = ''
export function setStorageScope(userId) { storageScope = userId ? `bacc-user:${userId}:` : '' }
const scoped = (key) => storageScope + key
const changed = () => {
  if (storageScope && typeof window !== 'undefined') window.dispatchEvent(new Event('bacc-storage-change'))
}

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(scoped(key))
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  try {
    const serialized = JSON.stringify(value)
    if (localStorage.getItem(scoped(key)) !== serialized) {
      localStorage.setItem(scoped(key), serialized)
      changed()
    }
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
      return localStorage.getItem(scoped(K.legacyName)) || ''
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
    localStorage.removeItem(scoped(K.results(id)))
    changed()
    localStorage.removeItem(scoped(K.attempts(id)))
    changed()
  } catch {
    /* noop */
  }
  if (rest.length) write(K.current, rest[0].id)
  else {
    try {
      localStorage.removeItem(scoped(K.current))
      changed()
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
  write(K.results(profileId), arr)
}

export function deleteResult(profileId, id) {
  write(
    K.results(profileId),
    loadResults(profileId).filter((r) => r.id !== id),
  )
}

export function clearResults(profileId) {
  try {
    localStorage.removeItem(scoped(K.results(profileId)))
    changed()
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

/* ---------------- คลังข้อสอบที่นำเข้าเอง (ต่อพาร์ท) ---------------- */
export function getQbank() {
  const data = read(K.qbank, {})
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export const importedQuestions = (partId) => {
  const list = getQbank()[partId]
  return Array.isArray(list) ? list : []
}

export function saveImportedQuestions(partId, questions = []) {
  const bank = getQbank()
  const existing = Array.isArray(bank[partId]) ? bank[partId] : []
  const seen = new Set(existing.map((q) => q.q))
  const fresh = questions.filter((q) => q?.q && !seen.has(q.q))
  bank[partId] = [...existing, ...fresh]
  write(K.qbank, bank)
  return { added: fresh.length, total: bank[partId].length }
}

export function clearImportedQuestions(partId) {
  const bank = getQbank()
  if (partId) delete bank[partId]
  write(K.qbank, partId ? bank : {})
  return getQbank()
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
    const t = localStorage.getItem(scoped(K.theme))
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* noop */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

export function setTheme(theme) {
  try {
    if (localStorage.getItem(scoped(K.theme)) !== theme) {
      localStorage.setItem(scoped(K.theme), theme)
      changed()
    }
  } catch {
    /* noop */
  }
}

/* ---------------- settings ---------------- */
const DEFAULT_SETTINGS = {
  instantReveal: true, // เฉลยทันทีเมื่อเลือกคำตอบ
  sound: false,
}

export function getSettings() {
  const raw = read(K.settings, null)
  return { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  write(K.settings, next)
  return next
}

/* ---------------- snapshot (สำหรับซิงก์ GitHub) ---------------- */
export function exportSnapshot() {
  const profiles = getProfiles()
  const results = {}
  const attempts = {}
  profiles.forEach((p) => {
    results[p.id] = loadResults(p.id)
    attempts[p.id] = listAttempts(p.id)
  })
  return {
    app: 'bacc-exam-2569',
    version: 2,
    updatedAt: new Date().toISOString(),
    profiles,
    results,
    attempts,
    sets: getSets(),
    qbank: getQbank(),
    settings: getSettings(),
    theme: (() => {
      try {
        const t = localStorage.getItem(scoped(K.theme))
        return t === 'dark' || t === 'light' ? t : ''
      } catch {
        return ''
      }
    })(),
  }
}

export function importSnapshot(data) {
  if (!data || typeof data !== 'object') return false
  try {
    if (Array.isArray(data.profiles)) write(K.profiles, data.profiles)
    if (data.results && typeof data.results === 'object') {
      Object.entries(data.results).forEach(([pid, list]) => write(K.results(pid), Array.isArray(list) ? list : []))
    }
    if (data.attempts && typeof data.attempts === 'object') {
      Object.entries(data.attempts).forEach(([pid, list]) =>
        write(K.attempts(pid), Array.isArray(list) ? Object.fromEntries(list.filter(a => a?.key).map(a => [a.key, a])) : (list && typeof list === 'object' ? list : {})),
      )
    }
    if (Array.isArray(data.sets)) write(K.sets, data.sets)
    if (data.qbank && typeof data.qbank === 'object') write(K.qbank, data.qbank)
    if (data.settings && typeof data.settings === 'object') write(K.settings, { ...DEFAULT_SETTINGS, ...data.settings })
    if (data.theme === 'dark' || data.theme === 'light') {
      try {
        localStorage.setItem(scoped(K.theme), data.theme)
      } catch {
        /* noop */
      }
    }
    if (!read(K.current, null) && Array.isArray(data.profiles) && data.profiles.length) {
      write(K.current, data.profiles[0].id)
    }
    return true
  } catch {
    return false
  }
}

/** รวมข้อมูล 2 ชุด (union ตาม id) — ใช้เมื่อดึงข้อมูลจาก GitHub */
export function mergeSnapshots(local, remote) {
  const a = local || {}
  const b = remote || {}
  const byId = (x, y) => {
    const map = new Map()
    ;[...(x || []), ...(y || [])].forEach((item) => {
      if (!item || !item.id) return
      const prev = map.get(item.id)
      if (!prev) {
        map.set(item.id, item)
        return
      }
      const t1 = new Date(prev.updatedAt || prev.date || prev.createdAt || 0).getTime()
      const t2 = new Date(item.updatedAt || item.date || item.createdAt || 0).getTime()
      if (t2 > t1) map.set(item.id, item)
    })
    return Array.from(map.values())
  }
  const mergeAttempts = (x, y) => {
    const map = new Map()
    ;[...(x || []), ...(y || [])].forEach((item) => {
      if (!item || !item.key) return
      const prev = map.get(item.key)
      if (!prev) {
        map.set(item.key, item)
        return
      }
      if (new Date(item.updatedAt || 0).getTime() >= new Date(prev.updatedAt || 0).getTime()) map.set(item.key, item)
    })
    return Array.from(map.values())
  }

  const results = {}
  const attempts = {}
  const pids = new Set([...Object.keys(a.results || {}), ...Object.keys(b.results || {})])
  pids.forEach((pid) => {
    results[pid] = byId(a.results?.[pid], b.results?.[pid]).sort(
      (x, y) => new Date(y.date || 0) - new Date(x.date || 0),
    )
  })
  const qbank = {}
  const qpids = new Set([...Object.keys(a.qbank || {}), ...Object.keys(b.qbank || {})])
  qpids.forEach((pid) => {
    const map = new Map()
    ;[...(a.qbank?.[pid] || []), ...(b.qbank?.[pid] || [])].forEach((q) => {
      if (q?.q && !map.has(q.q)) map.set(q.q, q)
    })
    qbank[pid] = Array.from(map.values())
  })

  const apids = new Set([...Object.keys(a.attempts || {}), ...Object.keys(b.attempts || {})])
  apids.forEach((pid) => {
    attempts[pid] = mergeAttempts(a.attempts?.[pid], b.attempts?.[pid])
  })

  return {
    app: 'bacc-exam-2569',
    version: 2,
    updatedAt: new Date().toISOString(),
    profiles: byId(a.profiles, b.profiles),
    results,
    attempts,
    sets: byId(a.sets, b.sets),
    qbank,
    settings: { ...DEFAULT_SETTINGS, ...(a.settings || {}), ...(b.settings || {}) },
    theme: b.theme || a.theme || '',
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
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const uidPublic = uid

// One-time, explicit import from the pre-account version. Never deletes legacy data.
export function legacyProfiles() {
  try {
    const list = JSON.parse(localStorage.getItem(K.profiles) || '[]')
    return Array.isArray(list) ? list : []
  } catch { return [] }
}
export function importLegacyProfile(legacyId, profileId) {
  const profile = legacyProfiles().find(p => p.id === legacyId)
  if (!profile || !profileId) return false
  const oldRead = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
  }
  const existing = loadResults(profileId)
  const ids = new Set(existing.map(r => r.id))
  const oldResults = oldRead(K.results(legacyId), [])
  const mergedResults = [...existing, ...(Array.isArray(oldResults) ? oldResults.filter(r => r && !ids.has(r.id)) : [])]
  mergedResults.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  write(K.results(profileId), mergedResults)
  const attempts = loadAttempts(profileId)
  const oldAttempts = oldRead(K.attempts(legacyId), {})
  for (const attempt of Object.values(oldAttempts || {})) {
    if (attempt?.key && (!attempts[attempt.key] || new Date(attempt.updatedAt || 0) > new Date(attempts[attempt.key].updatedAt || 0))) attempts[attempt.key] = attempt
  }
  write(K.attempts(profileId), attempts)
  for (const set of oldRead(K.sets, [])) if (!getSets().some(s => s.id === set.id)) saveSet(set)
  const qbank = oldRead(K.qbank, {})
  Object.entries(qbank || {}).forEach(([part, questions]) => { if (Array.isArray(questions)) saveImportedQuestions(part, questions) })
  return true
}
