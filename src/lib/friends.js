/* ============================================================
   Friend Arena Engine — รายชื่อเพื่อนทั้งหมดในระบบ, สถิติสาธารณะของเพื่อน,
   ระบบท้าแข่งหลายคน (Multiplayer Match) และกติกากด "ไม่แข่ง" ครบ 3 ครั้งไม่เตือนซ้ำ
   ============================================================ */

import { PARTS } from '../data/index.js'
import { supabase, normalizeName } from './supabase.js'
import { getProfiles, legacyProfiles, loadResults, mmss } from './storage.js'
import { computePartCompletion } from './completion.js'

export const MAX_CHALLENGE_DECLINES = 3
export const CHALLENGE_SNOOZE_MS = 8000

const ARENA_KEY = 'bacc2569:arena:v1'
const DECLINE_KEY = (uid) => `bacc2569:arena:decline:${uid || 'anon'}`
const CHANNEL_NAME = 'bacc-arena-v1'
const BC_NAME = 'bacc2569-arena'

/* ---------------- public stats calculation ---------------- */
export function computePublicStats(results = []) {
  const safe = Array.isArray(results) ? results.filter(Boolean) : []
  const count = safe.length
  const scores = safe.map((r) => Number(r.score) || 0)
  const avg = count ? Math.round(scores.reduce((a, b) => a + b, 0) / count) : 0
  const best = count ? Math.round(Math.max(...scores)) : 0
  const totalTimeSec = safe.reduce((s, r) => s + Math.max(0, Number(r.timeUsedSec) || 0), 0)

  const partStats = {}
  safe.forEach((r) => {
    if (!r.partId) return
    const cur = partStats[r.partId] || {
      partId: r.partId,
      partLabel: r.partLabel || r.partId,
      partTitle: r.partTitle || '',
      bestScore: 0,
      totalScore: 0,
      attempts: 0,
      bestTimeSec: null,
      lastDate: null,
    }
    const sc = Math.round((Number(r.score) || 0) * 10) / 10
    cur.attempts += 1
    cur.totalScore += sc
    if (sc >= cur.bestScore) {
      cur.bestScore = Math.round(sc)
      if (r.timeUsedSec) {
        cur.bestTimeSec =
          cur.bestTimeSec === null ? r.timeUsedSec : Math.min(cur.bestTimeSec, r.timeUsedSec)
      }
    }
    if (!cur.lastDate || new Date(r.date || 0) > new Date(cur.lastDate || 0)) {
      cur.lastDate = r.date || null
    }
    partStats[r.partId] = cur
  })

  Object.values(partStats).forEach((ps) => {
    ps.avgScore = ps.attempts ? Math.round(ps.totalScore / ps.attempts) : 0
    delete ps.totalScore
    const comp = computePartCompletion(ps.partId, safe, 60)
    ps.completionPct = comp.completionPct
    ps.isComplete = comp.isComplete
    if (comp.isComplete && comp.bestScore !== null) {
      ps.bestScore = Math.round(comp.bestScore)
    }
  })

  const passedParts = PARTS.filter((p) => {
    const comp = computePartCompletion(p, safe, 60)
    return comp.isComplete && (comp.bestScore || 0) >= 60
  }).length

  const recentResults = safe.slice(0, 10).map((r) => ({
    id: r.id,
    kind: r.kind || 'part',
    partId: r.partId || null,
    partLabel: r.partLabel || null,
    partTitle: r.partTitle || null,
    setName: r.setName || null,
    score: Math.round((Number(r.score) || 0) * 10) / 10,
    correct: Number(r.correct) || 0,
    total: Number(r.total) || 0,
    timeUsedSec: Number(r.timeUsedSec) || 0,
    date: r.date || null,
  }))

  return {
    count,
    avg,
    best,
    totalTimeSec,
    passedParts,
    partStats,
    recentResults,
  }
}

/* ---------------- 3-strike decline preference ---------------- */
export function getChallengePref(userId) {
  try {
    const raw = localStorage.getItem(DECLINE_KEY(userId))
    if (!raw) return { declineCount: 0, muted: false, snoozedUntil: 0, lastNudgeSeen: {} }
    const data = JSON.parse(raw)
    const declineCount = Math.max(0, Number(data?.declineCount) || 0)
    return {
      declineCount,
      muted: Boolean(data?.muted) || declineCount >= MAX_CHALLENGE_DECLINES,
      snoozedUntil: Number(data?.snoozedUntil) || 0,
      lastDeclinedAt: Number(data?.lastDeclinedAt) || 0,
      lastNudgeSeen: data?.lastNudgeSeen && typeof data.lastNudgeSeen === 'object' ? data.lastNudgeSeen : {},
    }
  } catch {
    return { declineCount: 0, muted: false, snoozedUntil: 0, lastNudgeSeen: {} }
  }
}

function saveChallengePref(userId, pref) {
  try {
    localStorage.setItem(DECLINE_KEY(userId), JSON.stringify(pref))
  } catch {
    /* noop */
  }
  return pref
}

export function recordChallengeDecline(userId, matchId, nudgeSeq = 1, now = Date.now()) {
  const prev = getChallengePref(userId)
  const declineCount = Math.min(MAX_CHALLENGE_DECLINES, (prev.declineCount || 0) + 1)
  const muted = declineCount >= MAX_CHALLENGE_DECLINES
  const next = {
    declineCount,
    muted,
    lastDeclinedAt: now,
    snoozedUntil: muted ? Number.MAX_SAFE_INTEGER : now + CHALLENGE_SNOOZE_MS,
    lastNudgeSeen: { ...(prev.lastNudgeSeen || {}), ...(matchId ? { [matchId]: nudgeSeq } : {}) },
  }
  return saveChallengePref(userId, next)
}

export function recordChallengeAccept(userId) {
  return saveChallengePref(userId, {
    declineCount: 0,
    muted: false,
    snoozedUntil: 0,
    lastDeclinedAt: 0,
    lastNudgeSeen: {},
  })
}

export function resetChallengeMute(userId) {
  return recordChallengeAccept(userId)
}

export function shouldShowChallengePopup({
  match,
  userId,
  pref,
  activeMatchId = null,
  now = Date.now(),
}) {
  if (!match || !userId) return false
  const currentPref = pref || getChallengePref(userId)
  if (currentPref.muted || (currentPref.declineCount || 0) >= MAX_CHALLENGE_DECLINES) return false
  if (match.status === 'cancelled' || match.status === 'finished') return false
  if (activeMatchId && activeMatchId === match.id) return false

  const players = Array.isArray(match.players) ? match.players : []
  const me = players.find((p) => p.userId === userId)
  if (!me || me.role === 'host') return false
  if (me.status !== 'invited') return false
  if ((me.declineCount || 0) >= MAX_CHALLENGE_DECLINES) return false

  const nudgeSeq = Number(match.nudgeSeq) || 1
  const seenSeq = Number(currentPref.lastNudgeSeen?.[match.id]) || 0
  if (nudgeSeq > seenSeq) return true
  if (now < (currentPref.snoozedUntil || 0)) return false
  return true
}

/* ---------------- shared local arena storage ---------------- */
function readLocalArena() {
  try {
    const raw = localStorage.getItem(ARENA_KEY)
    if (!raw) return { friends: {}, matches: {} }
    const parsed = JSON.parse(raw)
    return {
      friends: parsed?.friends && typeof parsed.friends === 'object' ? parsed.friends : {},
      matches: parsed?.matches && typeof parsed.matches === 'object' ? parsed.matches : {},
    }
  } catch {
    return { friends: {}, matches: {} }
  }
}

function writeLocalArena(arena) {
  try {
    const trimmedMatches = Object.values(arena.matches || {})
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 50)
    const payload = {
      friends: arena.friends || {},
      matches: Object.fromEntries(trimmedMatches.map((m) => [m.id, m])),
    }
    localStorage.setItem(ARENA_KEY, JSON.stringify(payload))
  } catch {
    /* noop */
  }
}

/** Harvests accounts previously stored on this browser so existing accounts appear immediately */
function harvestDeviceAccounts() {
  const discovered = {}
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (!k) continue
      const m = k.match(/^bacc-user:([^:]+):bacc2569:profiles$/)
      if (m) {
        const uid = m[1]
        const profiles = JSON.parse(localStorage.getItem(k) || '[]')
        if (!Array.isArray(profiles)) continue
        // ทุกโปรไฟล์ของทุกบัญชีที่เคยใช้เครื่องนี้ต้องขึ้นในรายชื่อ ไม่ใช่แค่โปรไฟล์แรก
        profiles.forEach((p, idx) => {
          if (!p?.id || !p?.name) return
          const rKey = `bacc-user:${uid}:bacc2569:results:${p.id}`
          const rs = JSON.parse(localStorage.getItem(rKey) || '[]')
          const id = idx === 0 ? uid : `local:${uid}:${p.id}`
          discovered[id] = {
            id,
            name: p.name,
            stats: computePublicStats(Array.isArray(rs) ? rs : []),
            updatedAt: p.createdAt || new Date(0).toISOString(),
          }
        })
      }
    }
    // Also harvest current scope profiles & legacy profiles if non-cloud
    const legacy = legacyProfiles()
    legacy.forEach((lp) => {
      if (!lp?.id || !lp?.name) return
      const rs = (() => {
        try {
          return JSON.parse(localStorage.getItem(`bacc2569:results:${lp.id}`) || '[]')
        } catch {
          return []
        }
      })()
      const id = `local:${lp.id}`
      discovered[id] = {
        id,
        name: lp.name,
        stats: computePublicStats(rs),
        updatedAt: lp.createdAt || new Date(0).toISOString(),
        isLocalLegacy: true,
      }
    })
  } catch {
    /* noop */
  }
  return discovered
}

function mergeFriendEntry(prev, next) {
  if (!prev) return next
  if (!next) return prev
  const tPrev = new Date(prev.updatedAt || 0).getTime()
  const tNext = new Date(next.updatedAt || 0).getTime()
  const newer = tNext >= tPrev ? next : prev
  const older = tNext >= tPrev ? prev : next
  const newerStats = newer.stats || {}
  const olderStats = older.stats || {}
  return {
    ...older,
    ...newer,
    stats: {
      ...olderStats,
      ...newerStats,
      partStats: { ...(olderStats.partStats || {}), ...(newerStats.partStats || {}) },
      recentResults:
        (newerStats.recentResults?.length || 0) >= (olderStats.recentResults?.length || 0)
          ? newerStats.recentResults || []
          : olderStats.recentResults || [],
    },
  }
}

function mergeMatchEntry(prev, next) {
  if (!prev) return next
  if (!next) return prev
  const tPrev = new Date(prev.updatedAt || prev.createdAt || 0).getTime()
  const tNext = new Date(next.updatedAt || next.createdAt || 0).getTime()
  const base = tNext >= tPrev ? { ...prev, ...next } : { ...next, ...prev }

  const pMap = new Map()
  ;[...(prev.players || []), ...(next.players || [])].forEach((p) => {
    if (!p?.userId) return
    const existing = pMap.get(p.userId)
    if (!existing) {
      pMap.set(p.userId, p)
      return
    }
    const tp1 = new Date(existing.updatedAt || 0).getTime()
    const tp2 = new Date(p.updatedAt || 0).getTime()
    pMap.set(p.userId, tp2 >= tp1 ? { ...existing, ...p } : { ...p, ...existing })
  })

  return {
    ...base,
    nudgeSeq: Math.max(Number(prev.nudgeSeq) || 1, Number(next.nudgeSeq) || 1),
    players: Array.from(pMap.values()),
  }
}

/** รวมรายชื่อเป็น directory เดียว
 *  - บัญชีจริง (ไม่ใช่ local:) ต้องได้แถวของตัวเองเสมอ แม้ตั้งชื่อซ้ำกัน
 *  - รายการ local: (โปรไฟล์เก่า/โปรไฟล์ในเครื่อง) จะยุบรวมกับ "คนเดียวกัน" ที่ชื่อตรงกันเท่านั้น
 */
export function normalizeFriendDirectory(friendsMap, onlineIds = new Set(), meId = null) {
  const entries = Object.values(friendsMap || {}).filter((f) => f && f.id && f.name)
  const isLocalMirror = (f) => String(f.id).startsWith('local:')
  const byId = new Map()

  entries.filter((f) => !isLocalMirror(f)).forEach((f) => {
    byId.set(f.id, f)
  })

  entries.filter(isLocalMirror).forEach((f) => {
    const key = normalizeName(f.name)
    const me = meId ? byId.get(meId) : null
    let targetId = me && normalizeName(me.name) === key ? meId : null
    if (!targetId) {
      for (const [id, entry] of byId) {
        if (normalizeName(entry.name) === key) {
          targetId = id
          break
        }
      }
    }
    if (!targetId) {
      byId.set(f.id, f)
      return
    }
    const base = byId.get(targetId)
    byId.set(targetId, {
      ...mergeFriendEntry(base, { ...f, id: targetId, name: base.name }),
      id: targetId,
      name: base.name,
    })
  })

  const mapped = Array.from(byId.values())
    .map((f) => {
      const stats = f.stats || computePublicStats([])
      const isMe = Boolean(meId && f.id === meId)
      const isOnline = isMe || onlineIds.has(f.id)
      return {
        id: f.id,
        name: f.name,
        isMe,
        online: isOnline,
        activity: isOnline ? f.activity || 'online' : 'offline',
        lastSeenAt: f.lastSeenAt || f.updatedAt || null,
        count: stats.count || 0,
        avg: stats.avg || 0,
        best: stats.best || 0,
        totalTimeSec: stats.totalTimeSec || 0,
        passedParts: stats.passedParts || 0,
        partStats: stats.partStats || {},
        recentResults: stats.recentResults || [],
      }
    })
    .sort(compareFriendsByAttempts)

  return ensureFriendColors(mapped)
}

/* ============================================================
   User Character Palette & Attempt-Count Ordering
   - เรียงตามจำนวนครั้งที่ทำข้อสอบมากสุด (count) ให้คนนั้นอยู่หน้าสุด
   - ผูกสีเดียวกันทั้งตัวละครบนลู่วิ่งและภาพโปรไฟล์/อวาตาร์ของผู้ใช้
   ============================================================ */

export const USER_CHARACTER_THEMES = [
  { color: '#2563EB', color2: '#60A5FA', dark: '#1E3A8A' }, // น้ำเงินรอยัล
  { color: '#EA580C', color2: '#FB923C', dark: '#9A3412' }, // ส้มคอรัล
  { color: '#16A34A', color2: '#4ADE80', dark: '#14532D' }, // เขียวมรกต
  { color: '#9333EA', color2: '#C084FC', dark: '#581C87' }, // ม่วงเทอร์โบ
  { color: '#DB2777', color2: '#F472B6', dark: '#831843' }, // ชมพูบานเย็น
  { color: '#0891B2', color2: '#22D3EE', dark: '#164E63' }, // ฟ้าน้ำทะเล
  { color: '#D97706', color2: '#FBBF24', dark: '#78350F' }, // ทองอำพัน
  { color: '#DC2626', color2: '#F87171', dark: '#7F1D1D' }, // แดงสปรินต์
  { color: '#0D9488', color2: '#2DD4BF', dark: '#134E4A' }, // เขียวอมฟ้า
  { color: '#4F46E5', color2: '#818CF8', dark: '#312E81' }, // ครามอินดิโก
]

export const RACE_LANE_COLORS = USER_CHARACTER_THEMES.map((t) => t.color)

const RACE_MEDALS = ['🥇', '🥈', '🥉']

export function compareFriendsByAttempts(a, b) {
  const countDiff = (Number(b?.count) || 0) - (Number(a?.count) || 0)
  if (countDiff !== 0) return countDiff
  const avgDiff = (Number(b?.avg) || 0) - (Number(a?.avg) || 0)
  if (avgDiff !== 0) return avgDiff
  const bestDiff = (Number(b?.best) || 0) - (Number(a?.best) || 0)
  if (bestDiff !== 0) return bestDiff
  if (Boolean(a?.online) !== Boolean(b?.online)) return a?.online ? -1 : 1
  const nameCmp = String(a?.name || '').localeCompare(String(b?.name || ''), 'th')
  if (nameCmp !== 0) return nameCmp
  return String(a?.id || a?.userId || '').localeCompare(String(b?.id || b?.userId || ''))
}

function themeFromHex(hex, fallbackIdx = 0) {
  const found = USER_CHARACTER_THEMES.find(
    (t) => t.color.toLowerCase() === String(hex || '').toLowerCase(),
  )
  if (found) return found
  if (hex) return { color: hex, color2: hex, dark: hex }
  return USER_CHARACTER_THEMES[Math.abs(fallbackIdx) % USER_CHARACTER_THEMES.length]
}

/**
 * ผูกสีประจำตัวผู้ใช้แต่ละคนให้ตรงกันทั้งตัวละครวิ่งแข่งและภาพผู้ใช้ (avatar)
 * โดยรักษาลำดับของอาร์เรย์ที่ส่งเข้ามา แต่กำหนดสีตามลำดับจำนวนครั้งที่สอบมากสุด
 */
export function ensureFriendColors(friends = []) {
  const safe = Array.isArray(friends) ? friends.filter(Boolean) : []
  if (!safe.length) return []

  const ranked = [...safe].sort(compareFriendsByAttempts)
  const themeByKey = new Map()
  const usedColors = new Set()

  ranked.forEach((f) => {
    const key = f.id ?? f.userId ?? f.name
    if (key && f.color && !themeByKey.has(key)) {
      const t = {
        color: f.color,
        color2: f.color2 || themeFromHex(f.color).color2,
        dark: f.colorDark || themeFromHex(f.color).dark,
      }
      themeByKey.set(key, t)
      usedColors.add(t.color.toLowerCase())
    }
  })

  let paletteCursor = 0
  ranked.forEach((f) => {
    const key = f.id ?? f.userId ?? f.name
    if (!key || themeByKey.has(key)) return
    let picked = null
    for (let step = 0; step < USER_CHARACTER_THEMES.length; step += 1) {
      const candidate =
        USER_CHARACTER_THEMES[(paletteCursor + step) % USER_CHARACTER_THEMES.length]
      if (!usedColors.has(candidate.color.toLowerCase())) {
        picked = candidate
        paletteCursor = paletteCursor + step + 1
        usedColors.add(candidate.color.toLowerCase())
        break
      }
    }
    if (!picked) {
      picked = USER_CHARACTER_THEMES[paletteCursor % USER_CHARACTER_THEMES.length]
      paletteCursor += 1
    }
    themeByKey.set(key, picked)
  })

  return safe.map((f, idx) => {
    const key = f.id ?? f.userId ?? f.name
    const t = themeByKey.get(key) || USER_CHARACTER_THEMES[idx % USER_CHARACTER_THEMES.length]
    return {
      ...f,
      color: t.color,
      color2: t.color2,
      colorDark: t.dark,
    }
  })
}

export function sortFriendsByAttempts(friends = []) {
  const colored = ensureFriendColors(friends)
  return [...colored].sort(compareFriendsByAttempts)
}

export function resolveUserTheme(target, friends = [], fallbackIndex = 0) {
  const colored = ensureFriendColors(friends)
  const targetId = typeof target === 'object' && target !== null ? target.id ?? target.userId : target
  if (typeof target === 'object' && target?.color) {
    return {
      color: target.color,
      color2: target.color2 || themeFromHex(target.color, fallbackIndex).color2,
      dark: target.colorDark || themeFromHex(target.color, fallbackIndex).dark,
    }
  }
  if (targetId !== null && targetId !== undefined) {
    const matched = colored.find((f) => (f.id ?? f.userId) === targetId)
    if (matched?.color) {
      return {
        color: matched.color,
        color2: matched.color2 || themeFromHex(matched.color, fallbackIndex).color2,
        dark: matched.colorDark || themeFromHex(matched.color, fallbackIndex).dark,
      }
    }
  }
  const t = USER_CHARACTER_THEMES[Math.abs(fallbackIndex) % USER_CHARACTER_THEMES.length]
  return { color: t.color, color2: t.color2, dark: t.dark }
}

/**
 * สร้างตัวละครวิ่งแข่งของผู้ใช้จริงบนแบนเนอร์เรียลไทม์
 * - เชื่อมโยงกับผู้ใช้จริงใต้ลู่วิ่งแบบ 1:1 (ชื่อ, จำนวนครั้งที่สอบ, สถานะออนไลน์/กำลังสอบ, สีเดียวกัน)
 * - จัดเรียงตามจำนวนครั้งที่ทำข้อสอบมากสุด (count) โดยให้คนมากสุดอยู่หน้าสุดเสมอ
 */
export function buildRealUserRacers(
  users = [],
  { meId = null, activeMatch = null, maxRacers = 6 } = {},
) {
  const valid = (Array.isArray(users) ? users : []).filter((u) => u && (u.id || u.userId) && u.name)
  if (!valid.length) return []

  const sorted = sortFriendsByAttempts(valid)
  const visible = sorted.slice(0, Math.max(1, maxRacers))
  const matchPlayers = Array.isArray(activeMatch?.players) ? activeMatch.players : []
  const laneOffsetsY = [48, 74, 40, 68, 52, 76, 44, 72]

  const frontX = 416
  const backX = 68
  const n = visible.length

  return visible.map((u, idx) => {
    const id = u.id ?? u.userId
    const name = String(u.name || 'ผู้เข้าสอบ').trim() || 'ผู้เข้าสอบ'
    const initial = name.charAt(0).toUpperCase() || 'ผ'
    const isMe = Boolean(u.isMe || (meId && id === meId))
    const online = Boolean(u.online || isMe)
    const count = Math.max(0, Number(u.count) || 0)
    const mp = matchPlayers.find((p) => p?.userId === id) || null
    const inLiveRace = Boolean(
      mp && (mp.status === 'playing' || mp.status === 'finished' || mp.status === 'accepted'),
    )
    const activity = inLiveRace
      ? 'racing'
      : u.activity || (online ? 'online' : 'offline')

    let x = frontX
    if (n === 2) {
      x = idx === 0 ? frontX : 236
    } else if (n > 2) {
      const span = frontX - backX
      x = Math.round(frontX - (idx * span) / (n - 1))
    }

    const liveTotal = Math.max(0, Number(mp?.totalQuestions || activeMatch?.examSpec?.totalQuestions) || 0)
    const liveAns = Math.max(0, Number(mp?.answeredCount) || 0)
    const statusText =
      mp?.status === 'finished'
        ? `เข้าเส้นชัย ${Math.round(Number(mp.score) || 0)}%`
        : mp?.status === 'playing' && liveTotal > 0
          ? `แข่งสด ${Math.min(liveAns, liveTotal)}/${liveTotal}`
          : count > 0
            ? `สอบ ${count} ครั้ง`
            : 'พร้อมลงสนาม'

    return {
      id,
      name,
      initial,
      isMe,
      online,
      activity,
      inLiveRace,
      count,
      avg: Math.round(Number(u.avg) || 0),
      best: Math.round(Number(u.best) || 0),
      rank: idx + 1,
      isLeader: idx === 0,
      medal: RACE_MEDALS[idx] || `#${idx + 1}`,
      color: u.color,
      color2: u.color2,
      colorDark: u.colorDark,
      variant: idx % 4,
      x,
      y: laneOffsetsY[idx % laneOffsetsY.length],
      statusText,
      user: u,
    }
  })
}

export function rankMatchPlayers(players = [], friends = []) {
  const friendCounts = new Map()
  ;(Array.isArray(friends) ? friends : []).forEach((f) => {
    const id = f?.id ?? f?.userId
    if (id) friendCounts.set(id, Math.max(0, Number(f.count) || 0))
  })
  const attemptsOf = (p) =>
    Math.max(
      0,
      Number(p?.examCount ?? p?.count ?? friendCounts.get(p?.userId) ?? 0) || 0,
    )

  return [...players].sort((a, b) => {
    const aDone = a.status === 'finished' ? 1 : 0
    const bDone = b.status === 'finished' ? 1 : 0
    if (aDone !== bDone) return bDone - aDone
    if (aDone && bDone) {
      const sDiff = (Number(b.score) || 0) - (Number(a.score) || 0)
      if (Math.abs(sDiff) > 0.01) return sDiff
      const tDiff = (Number(a.timeUsedSec) || 0) - (Number(b.timeUsedSec) || 0)
      if (tDiff !== 0) return tDiff
      return attemptsOf(b) - attemptsOf(a)
    }
    const aActive = a.status === 'playing' || a.status === 'accepted' ? 1 : 0
    const bActive = b.status === 'playing' || b.status === 'accepted' ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    const ansDiff = (Number(b.answeredCount) || 0) - (Number(a.answeredCount) || 0)
    if (ansDiff !== 0) return ansDiff
    return attemptsOf(b) - attemptsOf(a)
  })
}

/* ============================================================
   Live Race Lanes — ความก้าวหน้าของเพื่อนแต่ละคนถูกคำนวณเป็น "เลน"
   เพื่อนแต่ละคนได้เลนของตัวเอง (ไม่บังกันจนมองไม่เห็น)
   สีตัววิ่งตรงกับสีภาพผู้ใช้ (avatar) ของคนนั้นเสมอ
   ============================================================ */

/**
 * สร้างข้อมูลเลนแข่งขันสด (หนึ่งเลนต่อหนึ่งคนที่กำลังวิ่งแข่ง)
 * - เรียงตามอันดับจริง (ผู้จบก่อน/ทำไปเยอะสุดอยู่บน และหากเท่ากันให้ผู้ที่ทำข้อสอบมากสุดนำหน้า)
 * - pct = ความก้าวหน้า 0-100 (ผู้ส่งคำตอบแล้ว = 100 เสมอ)
 * - color = สีเดียวกับภาพผู้ใช้ในระบบ เพื่อดูง่ายขึ้นว่าตัวละครไหนคือใคร
 */
export function buildRaceLanes(
  players = [],
  { meId = null, totalQuestions = 0, friends = [] } = {},
) {
  const safe = Array.isArray(players) ? players.filter(Boolean) : []
  const coloredFriends = ensureFriendColors(friends)
  const friendMap = new Map()
  coloredFriends.forEach((f) => {
    const id = f?.id ?? f?.userId
    if (id) friendMap.set(id, f)
  })

  const racers = rankMatchPlayers(safe, coloredFriends).filter(
    (p) => p.status === 'playing' || p.status === 'finished' || p.status === 'accepted',
  )

  const usedColors = new Set()
  let fallbackCursor = 0
  const pickLaneTheme = (p) => {
    const matchedFriend = friendMap.get(p.userId)
    if (p.color || matchedFriend?.color) {
      const hex = p.color || matchedFriend.color
      const base = themeFromHex(hex)
      const theme = {
        color: hex,
        color2: p.color2 || matchedFriend?.color2 || base.color2,
        dark: p.colorDark || matchedFriend?.colorDark || base.dark,
      }
      if (!usedColors.has(theme.color.toLowerCase())) {
        usedColors.add(theme.color.toLowerCase())
        return theme
      }
    }
    for (let step = 0; step < USER_CHARACTER_THEMES.length; step += 1) {
      const candidate =
        USER_CHARACTER_THEMES[(fallbackCursor + step) % USER_CHARACTER_THEMES.length]
      if (!usedColors.has(candidate.color.toLowerCase())) {
        fallbackCursor = fallbackCursor + step + 1
        usedColors.add(candidate.color.toLowerCase())
        return candidate
      }
    }
    const fallback = USER_CHARACTER_THEMES[fallbackCursor % USER_CHARACTER_THEMES.length]
    fallbackCursor += 1
    return fallback
  }

  return racers.map((p, idx) => {
    const matchedFriend = friendMap.get(p.userId)
    const theme = pickLaneTheme(p)
    const total = Math.max(0, Number(p.totalQuestions) || Math.max(0, Number(totalQuestions) || 0))
    const answeredRaw = Math.max(0, Number(p.answeredCount) || 0)
    const answered = total > 0 ? Math.min(answeredRaw, total) : answeredRaw
    const finished = p.status === 'finished'
    const pct = finished ? 100 : total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0
    const score = Math.round(Number(p.score) || 0)
    const timeUsedSec = Math.max(0, Number(p.timeUsedSec) || 0)
    const name = matchedFriend?.name || p.name || 'ผู้แข่ง'
    const initial = String(name).trim().charAt(0).toUpperCase() || 'ผ'
    const examCount = Math.max(0, Number(matchedFriend?.count ?? p.examCount ?? p.count) || 0)

    const progressText = finished
      ? `${score}% · ${mmss(timeUsedSec)}`
      : total > 0
        ? `${answered}/${total} · ${pct}%`
        : 'กำลังวิ่ง'

    const summary = finished
      ? `${name} ส่งคำตอบแล้ว คะแนน ${score}% ใช้เวลา ${mmss(timeUsedSec)}`
      : total > 0
        ? `${name} ทำแล้ว ${answered} จาก ${total} ข้อ (${pct}%)`
        : `${name} กำลังทำข้อสอบ`

    return {
      userId: p.userId,
      name,
      initial,
      examCount,
      isMe: Boolean(meId && p.userId === meId),
      status: p.status,
      role: p.role || 'guest',
      rank: idx + 1,
      medal: finished ? RACE_MEDALS[idx] || `${idx + 1}` : '',
      color: theme.color,
      color2: theme.color2,
      colorDark: theme.dark,
      answeredCount: answered,
      totalQuestions: total,
      pct,
      finished,
      score,
      timeUsedSec,
      progressText,
      summary,
    }
  })
}

/* ---------------- Match ID & DB mapping ---------------- */
export const newMatchId = () =>
  `M-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`

function dbRowToMatch(row, playerRows = []) {
  return {
    id: row.id,
    hostUserId: row.host_user_id,
    hostName: row.host_name,
    title: row.title,
    message: row.message || '',
    examSpec: row.exam_spec,
    status: row.status || 'waiting',
    nudgeSeq: Number(row.nudge_seq) || 1,
    createdAt: row.created_at,
    startedAt: row.started_at || null,
    updatedAt: row.updated_at || row.created_at,
    players: playerRows.map((p) => ({
      userId: p.user_id,
      name: p.display_name,
      role: p.role || 'guest',
      status: p.status || 'invited',
      declineCount: Number(p.decline_count) || 0,
      answeredCount: Number(p.answered_count) || 0,
      totalQuestions: Number(p.total_questions) || 0,
      score: p.score !== null && p.score !== undefined ? Number(p.score) : null,
      correctCount: p.correct_count !== null && p.correct_count !== undefined ? Number(p.correct_count) : null,
      timeUsedSec: Number(p.time_used_sec) || 0,
      respondedAt: p.responded_at || null,
      finishedAt: p.finished_at || null,
      updatedAt: p.updated_at || row.updated_at,
    })),
  }
}

/* ============================================================
   Live Arena Session Controller
   ============================================================ */
export function createArenaController({
  userId,
  userName,
  getResults,
  onChange,
  client = supabase,
  profileId = null,
}) {
  let destroyed = false
  let dbReady = Boolean(client)
  let channel = null
  let bc = null
  let currentName = userName || 'ผู้เข้าสอบ'
  let currentActivity = 'online'
  let pulling = null
  let directoryStatus = { syncing: false, source: client ? 'pending' : 'local', error: null, syncedAt: null }
  const onlineIds = new Set(userId ? [userId] : [])

  const state = (() => {
    const initial = readLocalArena()
    const harvested = harvestDeviceAccounts()
    Object.entries(harvested).forEach(([id, entry]) => {
      initial.friends[id] = mergeFriendEntry(initial.friends[id], entry)
    })
    // โปรไฟล์ในเครื่อง: ของตัวเองใช้ user id หลัก โปรไฟล์อื่นต้องมี id ของตัวเองเพื่อไม่ให้ยุบหาย
    const localProfiles = getProfiles()
    localProfiles.forEach((p) => {
      if (!p?.id || !p?.name) return
      const isSelfProfile = profileId ? p.id === profileId : localProfiles.length === 1
      const id = userId ? (isSelfProfile ? userId : `local:${p.id}`) : p.id
      const rs = loadResults(p.id)
      initial.friends[id] = mergeFriendEntry(initial.friends[id], {
        id,
        name: p.name,
        stats: computePublicStats(rs),
        updatedAt: new Date().toISOString(),
      })
    })
    writeLocalArena(initial)
    return initial
  })()

  const emit = () => {
    if (destroyed) return
    const friends = normalizeFriendDirectory(state.friends, onlineIds, userId)
    onChange?.({
      friends,
      matches: Object.values(state.matches)
        .filter((m) => m && m.id && m.status !== 'cancelled')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
      pref: getChallengePref(userId),
      directory: {
        ...directoryStatus,
        count: friends.length,
        cloudCount: friends.filter((f) => !String(f.id).startsWith('local:')).length,
      },
    })
  }

  const broadcastLocal = (msg) => {
    try {
      bc?.postMessage(msg)
    } catch {
      /* noop */
    }
  }

  const broadcastRealtime = (event, payload) => {
    try {
      if (channel && typeof channel.send === 'function') {
        channel.send({ type: 'broadcast', event, payload })
      }
    } catch {
      /* noop */
    }
  }

  const applyIncomingFriend = (friend, persist = true) => {
    if (!friend?.id || !friend?.name) return
    state.friends[friend.id] = mergeFriendEntry(state.friends[friend.id], friend)
    if (persist) writeLocalArena(state)
  }

  const applyIncomingMatch = (match, persist = true) => {
    if (!match?.id) return
    state.matches[match.id] = mergeMatchEntry(state.matches[match.id], match)
    if (persist) writeLocalArena(state)
  }

  const refreshFromLocal = () => {
    const fresh = readLocalArena()
    Object.entries(fresh.friends).forEach(([id, f]) => {
      state.friends[id] = mergeFriendEntry(state.friends[id], f)
    })
    Object.entries(fresh.matches).forEach(([id, m]) => {
      state.matches[id] = mergeMatchEntry(state.matches[id], m)
    })
  }

  /* ---------- sync own profile & stats ---------- */
  const syncMyProfile = async ({ name, activity } = {}) => {
    if (name) currentName = name
    if (activity) currentActivity = activity
    if (!userId) return

    const results = typeof getResults === 'function' ? getResults() : []
    const stats = computePublicStats(results)
    const nowIso = new Date().toISOString()
    const meRecord = {
      id: userId,
      name: currentName,
      activity: currentActivity,
      stats,
      lastSeenAt: nowIso,
      updatedAt: nowIso,
    }
    applyIncomingFriend(meRecord, true)
    broadcastLocal({ type: 'friend', friend: meRecord })
    broadcastRealtime('friend-hello', { friend: meRecord })

    try {
      if (channel && typeof channel.track === 'function') {
        await channel.track({
          userId,
          name: currentName,
          activity: currentActivity,
          stats,
          updatedAt: nowIso,
        })
      }
    } catch {
      /* noop */
    }

    if (dbReady && client?.from && /^[0-9a-f-]{36}$/i.test(String(userId))) {
      try {
        const res = await client
          .from('friend_profiles')
          .upsert(
            {
              user_id: userId,
              display_name: currentName,
              stats,
              last_seen_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'user_id' },
          )
        if (res?.error && (res.error.code === '42P01' || res.error.code === 'PGRST205')) {
          dbReady = false
        }
      } catch {
        /* ignore network/mock errors */
      }
    }
    emit()
  }

  /* ---------- fetch full directory & matches from Supabase DB ---------- */
  const directoryErrorText = (err) => {
    if (!err) return null
    if (err.code === '42P01' || err.code === 'PGRST205') {
      return 'ยังไม่มีตาราง friend_profiles ในฐานข้อมูล (ต้องรัน migration friend_arena)'
    }
    if (err.code === '42501' || /permission|policy|rls/i.test(String(err.message || ''))) {
      return 'ฐานข้อมูลไม่อนุญาตให้อ่านรายชื่อเพื่อน (ตรวจ RLS ของ friend_profiles)'
    }
    return err.message || String(err)
  }

  const applyDirectoryRows = (rows) => {
    let applied = 0
    ;(Array.isArray(rows) ? rows : []).forEach((r) => {
      const id = r?.user_id || r?.id
      const name = r?.display_name || r?.name
      if (!id || !name) return
      applyIncomingFriend(
        {
          id,
          name,
          stats: r.stats || computePublicStats([]),
          lastSeenAt: r.last_seen_at || r.updatedAt || null,
          updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
        },
        false,
      )
      applied += 1
    })
    return applied
  }

  const pullFromDatabase = () => {
    if (pulling) return pulling
    if (!client?.from) {
      directoryStatus = { ...directoryStatus, syncing: false, source: 'local' }
      return Promise.resolve(null)
    }

    pulling = (async () => {
      directoryStatus = { ...directoryStatus, syncing: true, error: null }
      emit()
      let source = 'local'
      let errorText = null
      let otherAccounts = 0

      try {
        if (dbReady) {
          const profQuery = client
            .from('friend_profiles')
            .select('user_id, display_name, stats, last_seen_at, updated_at')
          const { data: rows, error } = await (profQuery?.order
            ? profQuery.order('updated_at', { ascending: false })
            : profQuery)
          if (error) {
            errorText = directoryErrorText(error)
            if (error.code === '42P01' || error.code === 'PGRST205') dbReady = false
          } else if (Array.isArray(rows)) {
            applyDirectoryRows(rows)
            otherAccounts = rows.filter((r) => r?.user_id && r.user_id !== userId).length
            if (rows.length) source = 'cloud'
          }
        }

        /* RPC สำรอง: การันตีรายชื่อทุกบัญชีในระบบ แม้ตาราง friend_profiles จะว่างหรือ backfill ไม่ครบ */
        if (typeof client?.rpc === 'function') {
          try {
            const { data: dirRows, error: rpcErr } = await client.rpc('list_friend_directory')
            if (!rpcErr && Array.isArray(dirRows) && dirRows.length) {
              applyDirectoryRows(dirRows)
              const fromRpc = dirRows.filter((r) => (r?.user_id || r?.id) !== userId).length
              if (fromRpc > otherAccounts) otherAccounts = fromRpc
              if (otherAccounts > 0) source = 'cloud-rpc'
            } else if (rpcErr) {
              const text = directoryErrorText(rpcErr)
              if (!errorText && otherAccounts === 0) errorText = text
            }
          } catch (rpcThrown) {
            if (!errorText && otherAccounts === 0) errorText = String(rpcThrown?.message || rpcThrown)
          }
        }

        /* matches */
        if (dbReady) {
          const matchQuery = client
            .from('friend_matches')
            .select('*')
            .order?.('updated_at', { ascending: false })
            .limit?.(40)
          if (matchQuery) {
            const { data: mRows, error: mErr } = await matchQuery
            if (!mErr && Array.isArray(mRows) && mRows.length > 0) {
              const ids = mRows.map((m) => m.id)
              const { data: pRows } = await client
                .from('friend_match_players')
                .select('*')
                .in('match_id', ids)
              const byMatch = new Map()
              ;(pRows || []).forEach((p) => {
                const arr = byMatch.get(p.match_id) || []
                arr.push(p)
                byMatch.set(p.match_id, arr)
              })
              mRows.forEach((m) => {
                applyIncomingMatch(dbRowToMatch(m, byMatch.get(m.id) || []), false)
              })
            }
          }
        }

        if (otherAccounts === 0 && source.startsWith('cloud')) source = 'cloud-me-only'
      } catch (err) {
        errorText = errorText || String(err?.message || err)
      } finally {
        pulling = null
        directoryStatus = {
          syncing: false,
          source,
          error: errorText,
          syncedAt: new Date().toISOString(),
        }
        writeLocalArena(state)
        emit()
      }
      return directoryStatus
    })()

    return pulling
  }

  /* ---------- persist match to DB + broadcast ---------- */
  const publishMatch = async (match, eventName = 'match-upsert') => {
    applyIncomingMatch(match, true)
    broadcastLocal({ type: 'match', match })
    broadcastRealtime(eventName, { match })
    emit()

    if (dbReady && client?.from && /^[0-9a-f-]{36}$/i.test(String(match.hostUserId))) {
      try {
        const { error: mErr } = await client.from('friend_matches').upsert(
          {
            id: match.id,
            host_user_id: match.hostUserId,
            host_name: match.hostName,
            title: match.title,
            message: match.message || '',
            exam_spec: match.examSpec,
            status: match.status,
            nudge_seq: match.nudgeSeq || 1,
            created_at: match.createdAt,
            started_at: match.startedAt || null,
            updated_at: match.updatedAt,
          },
          { onConflict: 'id' },
        )
        if (mErr) {
          if (mErr.code === '42P01' || mErr.code === 'PGRST205') dbReady = false
          return
        }
        const validPlayers = (match.players || []).filter((p) =>
          /^[0-9a-f-]{36}$/i.test(String(p.userId)),
        )
        if (validPlayers.length) {
          await client.from('friend_match_players').upsert(
            validPlayers.map((p) => ({
              match_id: match.id,
              user_id: p.userId,
              display_name: p.name,
              role: p.role || 'guest',
              status: p.status || 'invited',
              decline_count: p.declineCount || 0,
              answered_count: p.answeredCount || 0,
              total_questions: p.totalQuestions || 0,
              score: p.score ?? null,
              correct_count: p.correctCount ?? null,
              time_used_sec: p.timeUsedSec || 0,
              responded_at: p.respondedAt || null,
              finished_at: p.finishedAt || null,
              updated_at: p.updatedAt || match.updatedAt,
            })),
            { onConflict: 'match_id,user_id' },
          )
        }
      } catch {
        /* ignore */
      }
    }
  }

  /* ---------- match actions ---------- */
  const knownExamCount = (uid, fallback = 0) => {
    const entry = uid ? state.friends[uid] : null
    const fromState = Number(entry?.stats?.count ?? entry?.count)
    if (Number.isFinite(fromState) && fromState > 0) return fromState
    return Math.max(0, Number(fallback) || 0)
  }

  const createMatch = async ({ title, message = '', examSpec, invitedFriends = [] }) => {
    const nowIso = new Date().toISOString()
    const id = newMatchId()
    const myResults = typeof getResults === 'function' ? getResults() : []
    const myCount = Math.max(
      knownExamCount(userId),
      Array.isArray(myResults) ? myResults.filter(Boolean).length : 0,
    )
    const hostPlayer = {
      userId,
      name: currentName,
      role: 'host',
      status: 'accepted',
      examCount: myCount,
      declineCount: 0,
      answeredCount: 0,
      totalQuestions: examSpec?.totalQuestions || 0,
      score: null,
      correctCount: null,
      timeUsedSec: 0,
      respondedAt: nowIso,
      finishedAt: null,
      updatedAt: nowIso,
    }
    const guests = invitedFriends
      .filter((f) => f && f.id && f.id !== userId)
      .map((f) => ({
        userId: f.id,
        name: f.name,
        role: 'guest',
        status: 'invited',
        examCount: knownExamCount(f.id, f.count),
        declineCount: 0,
        answeredCount: 0,
        totalQuestions: examSpec?.totalQuestions || 0,
        score: null,
        correctCount: null,
        timeUsedSec: 0,
        respondedAt: null,
        finishedAt: null,
        updatedAt: nowIso,
      }))

    const match = {
      id,
      hostUserId: userId,
      hostName: currentName,
      title: title || `ประลองกับ ${currentName}`,
      message,
      examSpec,
      status: 'waiting',
      nudgeSeq: 1,
      createdAt: nowIso,
      startedAt: null,
      updatedAt: nowIso,
      players: [hostPlayer, ...guests],
    }
    await publishMatch(match, 'match-upsert')
    return match
  }

  const inviteFriendsToMatch = async (matchId, extraFriends = []) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur) return null
    const nowIso = new Date().toISOString()
    const existingIds = new Set((cur.players || []).map((p) => p.userId))
    const added = extraFriends
      .filter((f) => f?.id && !existingIds.has(f.id))
      .map((f) => ({
        userId: f.id,
        name: f.name,
        role: 'guest',
        status: 'invited',
        declineCount: 0,
        answeredCount: 0,
        totalQuestions: cur.examSpec?.totalQuestions || 0,
        score: null,
        correctCount: null,
        timeUsedSec: 0,
        respondedAt: null,
        finishedAt: null,
        updatedAt: nowIso,
      }))
    if (!added.length) return cur
    const next = {
      ...cur,
      nudgeSeq: (cur.nudgeSeq || 1) + 1,
      updatedAt: nowIso,
      players: [...(cur.players || []), ...added],
    }
    await publishMatch(next, 'match-upsert')
    return next
  }

  const nudgeMatch = async (matchId) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur) return null
    const nowIso = new Date().toISOString()
    const next = {
      ...cur,
      nudgeSeq: (cur.nudgeSeq || 1) + 1,
      updatedAt: nowIso,
    }
    await publishMatch(next, 'match-nudge')
    return next
  }

  const acceptMatch = async (matchId) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur) return null
    recordChallengeAccept(userId)
    const nowIso = new Date().toISOString()
    const exists = (cur.players || []).some((p) => p.userId === userId)
    const players = exists
      ? cur.players.map((p) =>
          p.userId === userId
            ? {
                ...p,
                name: currentName,
                status: p.status === 'playing' || p.status === 'finished' ? p.status : 'accepted',
                respondedAt: nowIso,
                updatedAt: nowIso,
              }
            : p,
        )
      : [
          ...(cur.players || []),
          {
            userId,
            name: currentName,
            role: 'guest',
            status: 'accepted',
            declineCount: 0,
            answeredCount: 0,
            totalQuestions: cur.examSpec?.totalQuestions || 0,
            score: null,
            correctCount: null,
            timeUsedSec: 0,
            respondedAt: nowIso,
            finishedAt: null,
            updatedAt: nowIso,
          },
        ]
    const next = { ...cur, updatedAt: nowIso, players }
    await publishMatch(next, 'match-upsert')
    return next
  }

  const declineMatch = async (matchId) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    const pref = recordChallengeDecline(userId, matchId, cur?.nudgeSeq || 1)
    if (!cur) {
      emit()
      return { match: null, pref }
    }
    const nowIso = new Date().toISOString()
    // Mark all open invited matches as declined once user reaches 3 declines
    const targetMatches = pref.muted
      ? Object.values(state.matches).filter(
          (m) =>
            m.id === matchId ||
            (m.players || []).some((p) => p.userId === userId && p.status === 'invited'),
        )
      : [cur]

    for (const m of targetMatches) {
      const players = (m.players || []).map((p) =>
        p.userId === userId
          ? {
              ...p,
              declineCount: pref.declineCount,
              status: pref.muted ? 'declined' : 'invited',
              respondedAt: nowIso,
              updatedAt: nowIso,
            }
          : p,
      )
      await publishMatch({ ...m, updatedAt: nowIso, players }, 'match-upsert')
    }
    return { match: state.matches[matchId], pref }
  }

  const startMatch = async (matchId) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur) return null
    const nowIso = new Date().toISOString()
    const next = {
      ...cur,
      status: 'active',
      startedAt: cur.startedAt || nowIso,
      updatedAt: nowIso,
      players: (cur.players || []).map((p) =>
        p.userId === userId && p.status === 'accepted'
          ? { ...p, status: 'playing', updatedAt: nowIso }
          : p,
      ),
    }
    await publishMatch(next, 'match-upsert')
    return next
  }

  const updateMatchProgress = async (matchId, { answeredCount = 0, totalQuestions = 0, timeUsedSec = 0 }) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur) return null
    const nowIso = new Date().toISOString()
    const next = {
      ...cur,
      status: cur.status === 'waiting' ? 'active' : cur.status,
      startedAt: cur.startedAt || nowIso,
      updatedAt: nowIso,
      players: (cur.players || []).map((p) =>
        p.userId === userId && p.status !== 'finished'
          ? {
              ...p,
              name: currentName,
              status: 'playing',
              answeredCount,
              totalQuestions: totalQuestions || p.totalQuestions || 0,
              timeUsedSec,
              updatedAt: nowIso,
            }
          : p,
      ),
    }
    await publishMatch(next, 'match-upsert')
    return next
  }

  const finishMatchPlayer = async (matchId, result) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur || !result) return null
    const nowIso = new Date().toISOString()
    const players = (cur.players || []).map((p) =>
      p.userId === userId
        ? {
            ...p,
            name: currentName,
            status: 'finished',
            answeredCount: result.total || p.totalQuestions || 0,
            totalQuestions: result.total || p.totalQuestions || 0,
            score: result.score,
            correctCount: result.correct,
            timeUsedSec: result.timeUsedSec || 0,
            finishedAt: nowIso,
            updatedAt: nowIso,
          }
        : p,
    )
    const activePlayers = players.filter((p) => p.status !== 'declined')
    const allDone = activePlayers.length >= 2 && activePlayers.every((p) => p.status === 'finished')
    const next = {
      ...cur,
      status: allDone ? 'finished' : 'active',
      updatedAt: nowIso,
      players,
    }
    await publishMatch(next, 'match-upsert')
    await syncMyProfile({ activity: 'online' })
    return next
  }

  const cancelMatch = async (matchId) => {
    refreshFromLocal()
    const cur = state.matches[matchId]
    if (!cur) return null
    const nowIso = new Date().toISOString()
    const next = { ...cur, status: 'cancelled', updatedAt: nowIso }
    await publishMatch(next, 'match-upsert')
    return next
  }

  /* ---------- transports setup ---------- */
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(BC_NAME)
      if (typeof bc.unref === 'function') bc.unref()
      bc.onmessage = (ev) => {
        const msg = ev?.data
        if (!msg) return
        if (msg.type === 'friend' && msg.friend) {
          onlineIds.add(msg.friend.id)
          applyIncomingFriend(msg.friend, false)
          emit()
        } else if (msg.type === 'match' && msg.match) {
          applyIncomingMatch(msg.match, false)
          emit()
        }
      }
    } catch {
      bc = null
    }
  }

  const onStorage = (ev) => {
    if (ev?.key && ev.key !== ARENA_KEY) return
    const fresh = readLocalArena()
    Object.entries(fresh.friends).forEach(([id, f]) => {
      state.friends[id] = mergeFriendEntry(state.friends[id], f)
    })
    Object.entries(fresh.matches).forEach(([id, m]) => {
      state.matches[id] = mergeMatchEntry(state.matches[id], m)
    })
    emit()
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', onStorage)
  }

  if (typeof client?.channel === 'function') {
    try {
      channel = client.channel(CHANNEL_NAME, {
        config: { presence: { key: userId || 'anon' } },
      })
      channel
        .on('presence', { event: 'sync' }, () => {
          try {
            const pState = channel.presenceState?.() || {}
            onlineIds.clear()
            if (userId) onlineIds.add(userId)
            Object.values(pState).forEach((arr) => {
              ;(arr || []).forEach((item) => {
                if (item?.userId && item?.name) {
                  onlineIds.add(item.userId)
                  applyIncomingFriend(
                    {
                      id: item.userId,
                      name: item.name,
                      activity: item.activity || 'online',
                      stats: item.stats || computePublicStats([]),
                      lastSeenAt: item.updatedAt,
                      updatedAt: item.updatedAt,
                    },
                    false,
                  )
                }
              })
            })
            writeLocalArena(state)
            emit()
          } catch {
            /* noop */
          }
        })
        .on('broadcast', { event: 'friend-hello' }, ({ payload }) => {
          if (payload?.friend) {
            onlineIds.add(payload.friend.id)
            applyIncomingFriend(payload.friend, true)
            // Share known directory & active matches with newly connected peer
            broadcastRealtime('friend-directory-sync', {
              friends: Object.values(state.friends).slice(0, 60),
              matches: Object.values(state.matches)
                .filter((m) => m.status === 'waiting' || m.status === 'active')
                .slice(0, 20),
            })
            emit()
          }
        })
        .on('broadcast', { event: 'friend-directory-sync' }, ({ payload }) => {
          ;(payload?.friends || []).forEach((f) => applyIncomingFriend(f, false))
          ;(payload?.matches || []).forEach((m) => applyIncomingMatch(m, false))
          writeLocalArena(state)
          emit()
        })
        .on('broadcast', { event: 'match-upsert' }, ({ payload }) => {
          if (payload?.match) {
            applyIncomingMatch(payload.match, true)
            emit()
          }
        })
        .on('broadcast', { event: 'match-nudge' }, ({ payload }) => {
          if (payload?.match) {
            applyIncomingMatch(payload.match, true)
            emit()
          }
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_profiles' },
          (chg) => {
            const r = chg?.new
            if (r?.user_id && r?.display_name) {
              applyIncomingFriend(
                {
                  id: r.user_id,
                  name: r.display_name,
                  stats: r.stats || computePublicStats([]),
                  lastSeenAt: r.last_seen_at,
                  updatedAt: r.updated_at,
                },
                true,
              )
              emit()
            }
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_matches' },
          () => {
            pullFromDatabase()
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friend_match_players' },
          () => {
            pullFromDatabase()
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            syncMyProfile()
            pullFromDatabase()
          }
        })
    } catch {
      channel = null
    }
  }

  // Initial sync
  emit()
  syncMyProfile()
  pullFromDatabase()

  return {
    syncMyProfile,
    pullFromDatabase,
    createMatch,
    inviteFriendsToMatch,
    nudgeMatch,
    acceptMatch,
    declineMatch,
    startMatch,
    updateMatchProgress,
    finishMatchPlayer,
    cancelMatch,
    resetMute: () => {
      resetChallengeMute(userId)
      emit()
    },
    getMatch: (id) => {
      refreshFromLocal()
      return state.matches[id] || null
    },
    destroy: () => {
      destroyed = true
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('storage', onStorage)
      }
      try {
        bc?.close()
      } catch {
        /* noop */
      }
      try {
        if (channel && client?.removeChannel) client.removeChannel(channel)
      } catch {
        /* noop */
      }
    },
  }
}
