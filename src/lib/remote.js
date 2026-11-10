/* ============================================================
   GitHub storage — เก็บข้อมูลผู้ใช้/ผลสอบ/ชุดข้อสอบไว้ใน "ฐานข้อมูล GitHub"
   รองรับ 2 โหมด
     1) repo    : ไฟล์ JSON ใน repository (ต้องใช้ fine-grained token สิทธิ์ Contents: RW)
     2) gist    : secret gist ส่วนตัว (token สิทธิ์ gist)
   หมายเหตุ: token เก็บไว้ในเบราว์เซอร์ของผู้ใช้เครื่องนี้เท่านั้น และส่งตรงถึง api.github.com
   ============================================================ */

import { SYNC_TARGET } from '../data/sync-target.js'
import { cloudFetch, cloudPush, cloudTest, isCloudConfig } from './cloud.js'

const CONFIG_KEY = 'bacc2569:github'
const API = 'https://api.github.com'

const validMode = (m) => (m === 'gist' || m === 'repo' || m === 'cloud' ? m : null)
const cloudTargetReady = (t) => Boolean(t?.firebase?.apiKey && t?.firebase?.databaseURL)

/** ปลายทางคลาวด์พร้อมใช้หรือไม่ (เจ้าของใส่ apiKey + databaseURL ไว้ใน sync-target.js) */
export const hasCloudTarget = () => cloudTargetReady(SYNC_TARGET) && SYNC_TARGET?.mode === 'cloud'

/** เติมค่าเริ่มต้นจาก sync-target.js เฉพาะช่องที่ยังว่าง */
export function withTargetDefaults(cfg = {}) {
  const t = SYNC_TARGET || {}
  const mode =
    validMode(cfg.mode) || (t.mode === 'cloud' && cloudTargetReady(t) ? 'cloud' : t.mode === 'repo' ? 'repo' : 'gist')
  return {
    mode,
    token: String(cfg.token || '').trim(),
    owner: String(cfg.owner || t.owner || '').trim(),
    repo: String(cfg.repo || t.repo || '').trim(),
    branch: String(cfg.branch || t.branch || 'main').trim() || 'main',
    path: String(cfg.path || t.path || 'bacc-data.json').trim() || 'bacc-data.json',
    gistId: String(cfg.gistId || t.gistId || '').trim(),
    savedAt: cfg.savedAt || null,
    /* เฉพาะโหมด cloud */
    apiKey: String(cfg.apiKey || t.firebase?.apiKey || '').trim(),
    databaseURL: String(cfg.databaseURL || t.firebase?.databaseURL || '').trim(),
    authBase: String(cfg.authBase || '').trim(),
    secureBase: String(cfg.secureBase || '').trim(),
  }
}

const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin)
}

const b64decode = (b64) => {
  const bin = atob(String(b64).replace(/\s/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/* ---------------- config ---------------- */
export function getGithubConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw)
    if (!cfg || !cfg.token) return null
    return withTargetDefaults(cfg)
  } catch {
    return null
  }
}

export function normalizeGithubConfig(cfg) {
  return {
    mode: validMode(cfg?.mode) || 'repo',
    token: String(cfg?.token || '').trim(),
    owner: String(cfg?.owner || '').trim(),
    repo: String(cfg?.repo || '').trim(),
    branch: String(cfg?.branch || 'main').trim() || 'main',
    path: String(cfg?.path || 'bacc-data.json').trim() || 'bacc-data.json',
    gistId: String(cfg?.gistId || '').trim(),
    apiKey: String(cfg?.apiKey || '').trim(),
    databaseURL: String(cfg?.databaseURL || '').trim(),
    authBase: String(cfg?.authBase || '').trim(),
    secureBase: String(cfg?.secureBase || '').trim(),
    savedAt: new Date().toISOString(),
  }
}

export function saveGithubConfig(cfg) {
  const clean = normalizeGithubConfig(cfg)
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(clean))
  } catch {
    /* noop */
  }
  return clean
}

export function clearGithubConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY)
  } catch {
    /* noop */
  }
}

export const isValidConfig = (cfg) =>
  Boolean(
    cfg &&
      (cfg.mode === 'cloud'
        ? cfg.apiKey && cfg.databaseURL
        : cfg.token && (cfg.mode === 'gist' ? true : cfg.owner && cfg.repo)),
  )

/** config ที่ใช้ซิงก์จริง — โหมด cloud ทำงานเองโดยไม่ต้องตั้งค่า (ใช้ค่าจาก sync-target.js) */
export function getSyncConfig() {
  let stored = null
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) stored = JSON.parse(raw)
  } catch {
    stored = null
  }
  if (stored) {
    const cfg = withTargetDefaults(stored)
    if (isValidConfig(cfg)) return cfg
  }
  /* ไม่มี config ที่ตั้งเอง → ถ้าเจ้าของเปิดโหมด cloud ไว้ ให้ซิงก์อัตโนมัติเลย */
  const target = withTargetDefaults({})
  if (target.mode === 'cloud' && isValidConfig(target)) return target
  /* โหมด GitHub: ต้องมี token ที่ผู้ใช้กรอกเองเท่านั้น */
  return null
}

/* ---------------- helpers ---------------- */
const headers = (cfg) => ({
  Authorization: `Bearer ${cfg.token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
})

const repoUrl = (cfg) =>
  `${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`

async function ghFetch(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    // fetch โยน TypeError เมื่อเน็ตหลุด/โดนบล็อก/ใบรับรองผิด — แปลให้เข้าใจง่าย
    const err = new Error('เชื่อมต่อ api.github.com ไม่ได้ — ตรวจอินเทอร์เน็ต หรือเครือข่ายที่บล็อก GitHub')
    err.status = 0
    throw err
  }
  let body = null
  const text = await res.text()
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { message: text.slice(0, 180) }
  }
  if (!res.ok) {
    const message =
      res.status === 401
        ? 'token ไม่ถูกต้องหรือหมดอายุ'
        : res.status === 403
          ? 'token ไม่มีสิทธิ์เขียนไฟล์นี้'
          : res.status === 404
            ? 'ไม่พบ repository/ไฟล์ (ตรวจชื่อ owner, repo หรือสิทธิ์ token)'
            : res.status === 409
              ? 'ไฟล์ถูกแก้ไขจากที่อื่น กรุณาดึงข้อมูลใหม่'
              : body?.message || `HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  return body
}

/* ---------------- public API ---------------- */
export async function testConnection(cfg) {
  if (!isValidConfig(cfg)) throw new Error('กรอกข้อมูลไม่ครบ (token / owner / repo)')
  if (cfg.mode === 'cloud') return cloudTest(cfg)
  if (cfg.mode === 'gist') {
    const me = await ghFetch(`${API}/user`, { headers: headers(cfg) })
    return { ok: true, login: me?.login || '', detail: 'เชื่อมต่อ gist ได้' }
  }
  const repo = await ghFetch(`${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`, {
    headers: headers(cfg),
  })
  return { ok: true, login: repo?.full_name || '', detail: 'พบ repository' }
}

/** ดึงชื่อบัญชี GitHub จาก token (ใช้เติม owner อัตโนมัติ) */
export async function fetchLogin(cfg) {
  if (!cfg?.token) throw new Error('กรอก token ก่อน')
  const me = await ghFetch(`${API}/user`, { headers: headers(cfg) })
  if (!me?.login) throw new Error('อ่านชื่อบัญชีไม่ได้')
  return me.login
}

/** ดึงข้อมูลจาก GitHub / Cloud → { data, sha } หรือ null ถ้ายังไม่มีไฟล์ */
export async function fetchRemote(cfg) {
  if (!isValidConfig(cfg)) return null
  if (cfg.mode === 'cloud') return cloudFetch(cfg)
  if (cfg.mode === 'gist') {
    const gist = await ghFetch(`${API}/gists/${encodeURIComponent(cfg.gistId)}`, { headers: headers(cfg) })
    const file = gist?.files?.[cfg.path] || Object.values(gist?.files || {})[0]
    if (!file) return null
    const content = file.truncated ? await fetchRaw(file.raw_url) : file.content
    return { data: JSON.parse(content), sha: gist.id, gistId: gist.id }
  }
  let res
  try {
    res = await fetch(repoUrl(cfg) + `?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg) })
  } catch {
    const err = new Error('เชื่อมต่อ api.github.com ไม่ได้ — ตรวจอินเทอร์เน็ตหรือเครือข่ายที่บล็อก GitHub')
    err.status = 0
    throw err
  }
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(res.status === 401 ? 'token ไม่ถูกต้อง' : `อ่านไฟล์ไม่สำเร็จ (HTTP ${res.status})`)
    err.status = res.status
    err.body = text.slice(0, 180)
    throw err
  }
  const body = await res.json()
  const content = b64decode(body.content || '')
  return { data: JSON.parse(content || '{}'), sha: body.sha }
}

const fetchRaw = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('ดาวน์โหลดไฟล์จาก gist ไม่สำเร็จ')
  return res.text()
}

/** เขียนข้อมูลขึ้น GitHub / Cloud → คืน sha ใหม่ */
export async function pushRemote(cfg, data, sha) {
  if (!isValidConfig(cfg)) throw new Error('ยังไม่ได้เชื่อมต่อคลังข้อมูล')
  if (cfg.mode === 'cloud') return cloudPush(cfg, data)
  const json = JSON.stringify(data, null, 2)
  const message = `bacc: sync data ${new Date().toISOString()}`

  if (cfg.mode === 'gist') {
    if (!cfg.gistId) {
      const created = await ghFetch(`${API}/gists`, {
        method: 'POST',
        headers: headers(cfg),
        body: JSON.stringify({
          description: 'BACC Exam 2569 — data (Ton Skywalker)',
          public: false,
          files: { [cfg.path]: { content: json } },
        }),
      })
      return { sha: created.id, gistId: created.id }
    }
    const updated = await ghFetch(`${API}/gists/${encodeURIComponent(cfg.gistId)}`, {
      method: 'PATCH',
      headers: headers(cfg),
      body: JSON.stringify({ files: { [cfg.path]: { content: json } } }),
    })
    return { sha: updated.id, gistId: updated.id }
  }

  const created = await ghFetch(repoUrl(cfg), {
    method: 'PUT',
    headers: headers(cfg),
    body: JSON.stringify({
      message,
      content: b64encode(json),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  })
  return { sha: created?.content?.sha || created?.commit?.sha || sha }
}

/** สร้างไฟล์ตั้งต้นใน repository (ใช้ครั้งแรก) */
export async function ensureRemoteFile(cfg, data) {
  const existing = await fetchRemote(cfg)
  if (existing) return existing
  const res = await pushRemote(cfg, data, null)
  return { data, sha: res.sha }
}

/* ============================================================
   ลิงก์เชื่อมอัตโนมัติ — ?sync=gist:{token}:{gistId?} | ?sync=repo:{token}
   ผู้ใช้เปิดลิงก์นี้ → ระบบบันทึก config แล้วซิงก์เลย ไม่ต้องกรอกฟอร์ม
   ============================================================ */
export function parseSyncLink(loc) {
  try {
    const sp = new URLSearchParams(loc?.search || '')
    const val = sp.get('sync')
    if (!val) return null
    if (val.startsWith('cloud:')) {
      const rest = val.slice('cloud:'.length)
      const idx = rest.indexOf(':')
      if (idx < 8) return null
      const apiKey = rest.slice(0, idx)
      const databaseURL = decodeURIComponent(rest.slice(idx + 1) || '')
      if (!/^https?:\/\//.test(databaseURL)) return null
      return withTargetDefaults({ mode: 'cloud', apiKey, databaseURL })
    }
    const m = val.match(/^(gist|repo):([^:\s?#]{8,})(?::([0-9a-f]{16,64}))?$/)
    if (!m) return null
    const [, mode, token, gistId] = m
    return withTargetDefaults({ mode, token, gistId: gistId || '' })
  } catch {
    return null
  }
}

/** URL สะอาด (ลบพารามิเตอร์ sync ทิ้งหลังใช้งาน เพื่อไม่ให้ token ค้างในประวัติเบราว์เซอร์) */
export function stripSyncLinkParam(loc) {
  const sp = new URLSearchParams(loc.search)
  sp.delete('sync')
  const q = sp.toString()
  return `${loc.pathname}${q ? `?${q}` : ''}${loc.hash || ''}`
}

/** สร้างลิงก์สำหรับแชร์ให้เครื่องอื่น/เพื่อน (ใช้ config ที่เชื่อมอยู่) */
export function buildSyncLink(cfg, origin, pathname) {
  const clean = getSafeConfig(cfg)
  if (!clean) return ''
  let param
  if (clean.mode === 'cloud') {
    param = `cloud:${clean.apiKey}:${encodeURIComponent(clean.databaseURL)}`
  } else {
    param = clean.mode === 'gist' ? `gist:${clean.token}:${clean.gistId || ''}` : `repo:${clean.token}`
  }
  return `${origin}${pathname}?sync=${encodeURIComponent(param)}`
}

const getSafeConfig = (cfg) => {
  if (cfg?.mode === 'cloud') {
    if (!cfg.apiKey || !cfg.databaseURL) return null
    return withTargetDefaults(cfg)
  }
  if (!cfg?.token) return null
  return withTargetDefaults(cfg)
}
