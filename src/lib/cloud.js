/* ============================================================
   Cloud storage — Firebase Realtime Database ผ่าน REST API ล้วน ๆ
   (ไม่ใช้ SDK เพื่อให้ bundle เล็ก) — ผู้ใช้ไม่ต้องตั้งค่าอะไรเลย
   - ล็อกอินแบบ anonymous (ซ่อนอยู่หลังฉาก) เพื่อให้ผ่าน security rules
   - เก็บ snapshot เดียวกันกับโหมด GitHub ไว้ที่ /bacc2569/data.json
   ============================================================ */

import { mergeSnapshots } from './storage.js'

const AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1'
const SECURE_BASE = 'https://securetoken.googleapis.com/v1'
const TOKEN_KEY = 'bacc2569:fbauth'
const DATA_PATH = 'bacc2569/data.json'
/* เผื่อไว้ 60 วิ เพื่อกัน token หมดอายุระหว่าง request */
const SAFETY_MS = 60_000

export const isCloudConfig = (cfg) =>
  Boolean(cfg && cfg.mode === 'cloud' && cfg.apiKey && cfg.databaseURL)

const trimSlash = (url) => String(url || '').replace(/\/+$/, '')

/* ---------------- anonymous auth (แคชไว้ ไม่ต้องล็อกอินบ่อย) ---------------- */
const readAuthCache = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    return c?.idToken && c?.expiresAt ? c : null
  } catch {
    return null
  }
}

const writeAuthCache = (auth) => {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(auth))
  } catch {
    /* noop */
  }
}

async function postJson(url, body) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    const err = new Error('เชื่อมต่อฐานข้อมูลคลาวด์ไม่ได้ — ตรวจอินเทอร์เน็ต')
    err.status = 0
    throw err
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`
    const err = new Error(
      msg.includes('ADMIN_ONLY') || msg.includes('CONFIGURATION')
        ? 'ยังไม่เปิด Anonymous Sign-in ใน Firebase (ดูขั้นตอนใน docs/cloud-setup.md)'
        : `ล็อกอินคลาวด์ไม่สำเร็จ (${msg})`,
    )
    err.status = res.status
    throw err
  }
  return data
}

async function signInAnonymously(cfg) {
  const base = cfg.authBase || AUTH_BASE
  const data = await postJson(`${base}/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`, {
    returnSecureToken: true,
  })
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken || '',
    expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
  }
}

async function refreshAuth(cfg, refreshToken) {
  const base = cfg.secureBase || SECURE_BASE
  let res
  try {
    res = await fetch(`${base}/token?key=${encodeURIComponent(cfg.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    })
  } catch {
    const err = new Error('เชื่อมต่อฐานข้อมูลคลาวด์ไม่ได้ — ตรวจอินเทอร์เน็ต')
    err.status = 0
    throw err
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.id_token) throw new Error('ต่ออายุการล็อกอินคลาวด์ไม่สำเร็จ')
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  }
}

/** เอา idToken ที่ยังไม่หมดอายุ (ล็อกอิน/ต่ออายุให้อัตโนมัติ) */
export async function ensureCloudAuth(cfg) {
  const cached = readAuthCache()
  if (cached && cached.expiresAt - SAFETY_MS > Date.now()) return cached.idToken
  if (cached?.refreshToken) {
    try {
      const next = await refreshAuth(cfg, cached.refreshToken)
      writeAuthCache(next)
      return next.idToken
    } catch {
      /* refresh พลาด → ล็อกอินใหม่ */
    }
  }
  const fresh = await signInAnonymously(cfg)
  writeAuthCache(fresh)
  return fresh.idToken
}

/* ---------------- read / write ---------------- */
async function dbRequest(cfg, token, method, body) {
  const url = `${trimSlash(cfg.databaseURL)}/${DATA_PATH}?auth=${encodeURIComponent(token)}`
  let res
  try {
    res = await fetch(url, {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    const err = new Error('เชื่อมต่อฐานข้อมูลคลาวด์ไม่ได้ — ตรวจอินเทอร์เน็ต')
    err.status = 0
    throw err
  }
  if (res.status === 401 || res.status === 403) {
    const err = new Error('ฐานข้อมูลไม่ยอมรับการเข้าถึง — ตรวจ Security Rules (ต้องให้ auth != null)')
    err.status = res.status
    throw err
  }
  if (!res.ok) {
    const err = new Error(`คลาวด์ตอบกลับผิดปกติ (HTTP ${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => null)
}

/** ดึง snapshot จากคลาวด์ → { data, sha } (sha ใช้ updatedAt แทน) หรือ null ถ้ายังไม่มี */
export async function cloudFetch(cfg) {
  const token = await ensureCloudAuth(cfg)
  const data = await dbRequest(cfg, token, 'GET')
  if (!data) return null
  return { data, sha: data.updatedAt || null }
}

/** เขียนข้อมูลขึ้นคลาวด์แบบ merge ก่อนส่ง (กันทับกันระหว่างหลายเครื่อง) */
export async function cloudPush(cfg, snapshot) {
  const token = await ensureCloudAuth(cfg)
  const remote = await dbRequest(cfg, token, 'GET')
  const merged = remote ? mergeSnapshots(remote, snapshot) : snapshot
  await dbRequest(cfg, token, 'PUT', merged)
  return { sha: merged.updatedAt || null }
}

/** ทดสอบการเชื่อมต่อ (ใช้ในหน้าตั้งค่า) */
export async function cloudTest(cfg) {
  const token = await ensureCloudAuth(cfg)
  await dbRequest(cfg, token, 'GET')
  return { ok: true, login: 'Firebase Realtime Database', detail: 'เชื่อมฐานข้อมูลคลาวด์ได้' }
}
