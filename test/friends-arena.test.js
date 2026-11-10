import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CHALLENGE_SNOOZE_MS,
  MAX_CHALLENGE_DECLINES,
  computePublicStats,
  createArenaController,
  getChallengePref,
  recordChallengeAccept,
  recordChallengeDecline,
  resetChallengeMute,
   rankMatchPlayers,
  shouldShowChallengePopup,
} from '../src/lib/friends.js'

class MemoryStorage {
  data = new Map()
  get length() { return this.data.size }
  key(i) { return Array.from(this.data.keys())[i] ?? null }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null }
  setItem(k, v) { this.data.set(k, String(v)) }
  removeItem(k) { this.data.delete(k) }
}

globalThis.localStorage = new MemoryStorage()
globalThis.window = new EventTarget()
window.matchMedia = () => ({ matches: false })

test('3-strike challenge decline rule nudges up to 3 times and permanently stops alerting on 3rd decline', () => {
  const bobId = '00000000-0000-0000-0000-000000000002'
  resetChallengeMute(bobId)

  const match = {
    id: 'M-TEST-1',
    hostUserId: '00000000-0000-0000-0000-000000000001',
    hostName: 'ต้น',
    status: 'waiting',
    nudgeSeq: 1,
    players: [
      { userId: '00000000-0000-0000-0000-000000000001', name: 'ต้น', role: 'host', status: 'accepted' },
      { userId: bobId, name: 'บ็อบ', role: 'guest', status: 'invited', declineCount: 0 },
    ],
  }

  const t0 = 1_000_000
  // Initial invite -> Popup #1 shows
  assert.equal(shouldShowChallengePopup({ match, userId: bobId, pref: getChallengePref(bobId), now: t0 }), true)

  // Decline #1 -> hides during snooze, re-appears after snooze
  const p1 = recordChallengeDecline(bobId, match.id, 1, t0)
  assert.equal(p1.declineCount, 1)
  assert.equal(p1.muted, false)
  assert.equal(shouldShowChallengePopup({ match, userId: bobId, pref: p1, now: t0 + 1000 }), false)
  assert.equal(
    shouldShowChallengePopup({ match, userId: bobId, pref: p1, now: t0 + CHALLENGE_SNOOZE_MS + 10 }),
    true,
  )

  // Decline #2 -> hides during snooze, re-appears on host nudge (nudgeSeq = 2)
  const p2 = recordChallengeDecline(bobId, match.id, 1, t0 + 10_000)
  assert.equal(p2.declineCount, 2)
  assert.equal(p2.muted, false)
  assert.equal(shouldShowChallengePopup({ match, userId: bobId, pref: p2, now: t0 + 11_000 }), false)
  assert.equal(
    shouldShowChallengePopup({ match: { ...match, nudgeSeq: 2 }, userId: bobId, pref: p2, now: t0 + 11_000 }),
    true,
  )

  // Decline #3 -> muted = true! Never alerts again even on new challenges or nudges
  const p3 = recordChallengeDecline(bobId, match.id, 2, t0 + 12_000)
  assert.equal(p3.declineCount, MAX_CHALLENGE_DECLINES)
  assert.equal(p3.muted, true)
  assert.equal(
    shouldShowChallengePopup({ match: { ...match, nudgeSeq: 99 }, userId: bobId, pref: p3, now: t0 + 999_999 }),
    false,
  )
  const newMatch = { ...match, id: 'M-NEW-2', nudgeSeq: 1 }
  assert.equal(
    shouldShowChallengePopup({ match: newMatch, userId: bobId, pref: p3, now: t0 + 999_999 }),
    false,
  )

  // Accepting / manual reset re-enables alerts cleanly
  const reset = recordChallengeAccept(bobId)
  assert.equal(reset.declineCount, 0)
  assert.equal(reset.muted, false)
})

test('multiplayer arena lists all system friends, preserves stats of non-competing friends, and ranks N players', async () => {
  localStorage.data.clear()

  const dianaResults = [
    { id: 'd1', partId: '1-1', partLabel: '1.1', partTitle: 'คณิต', score: 92, correct: 92, total: 100, timeUsedSec: 900, date: '2026-11-10T01:00:00Z' },
    { id: 'd2', partId: '2', partLabel: '2', partTitle: 'ความละเอียด', score: 84, correct: 84, total: 100, timeUsedSec: 700, date: '2026-11-10T02:00:00Z' },
  ]
  const dianaStats = computePublicStats(dianaResults)
  assert.equal(dianaStats.count, 2)
  assert.equal(dianaStats.avg, 88)
  assert.equal(dianaStats.best, 92)
  assert.equal(dianaStats.passedParts, 2)

  // Seed 4 system accounts in shared storage
  localStorage.setItem('bacc-user:u-diana:bacc2569:profiles', JSON.stringify([{ id: 'pd', name: 'ไดอาน่า' }]))
  localStorage.setItem('bacc-user:u-diana:bacc2569:results:pd', JSON.stringify(dianaResults))
  localStorage.setItem('bacc-user:u-bob:bacc2569:profiles', JSON.stringify([{ id: 'pb', name: 'บ็อบ' }]))
  localStorage.setItem('bacc-user:u-charlie:bacc2569:profiles', JSON.stringify([{ id: 'pc', name: 'ชาร์ลี' }]))

  let latestArena = null
  const aliceCtrl = createArenaController({
    userId: 'u-alice',
    userName: 'อลิซ',
    getResults: () => [{ id: 'a1', partId: '1-1', score: 75, correct: 75, total: 100, timeUsedSec: 1100 }],
    onChange: (snap) => { latestArena = snap },
    client: null,
  })
  const bobCtrl = createArenaController({ userId: 'u-bob', userName: 'บ็อบ', getResults: () => [], client: null })
  const charlieCtrl = createArenaController({ userId: 'u-charlie', userName: 'ชาร์ลี', getResults: () => [], client: null })
  const dianaCtrl = createArenaController({ userId: 'u-diana', userName: 'ไดอาน่า', getResults: () => dianaResults, client: null })

  // All 4 system accounts appear in the friend directory
  assert.equal(latestArena.friends.length, 4)

  // Host Alice invites Bob, Charlie, and Diana to a 4-player match
  const match = await aliceCtrl.createMatch({
    title: 'พาร์ท 1.1 · คณิตศาสตร์',
    message: 'มาดวลกัน 4 คน!',
    examSpec: { kind: 'part', partId: '1-1', title: 'พาร์ท 1.1', totalQuestions: 100 },
    invitedFriends: [
      { id: 'u-bob', name: 'บ็อบ' },
      { id: 'u-charlie', name: 'ชาร์ลี' },
      { id: 'u-diana', name: 'ไดอาน่า' },
    ],
  })
  assert.equal(match.players.length, 4)

  // Bob & Charlie accept; Diana declines 3 times
  await bobCtrl.acceptMatch(match.id)
  await charlieCtrl.acceptMatch(match.id)
  await dianaCtrl.declineMatch(match.id)
  await dianaCtrl.declineMatch(match.id)
  const d3 = await dianaCtrl.declineMatch(match.id)
  assert.equal(d3.pref.muted, true)

  // Even though Diana declined 3 times and is not competing, her stats are still fully visible in Alice's friend list!
  const dianaInDirectory = latestArena.friends.find((f) => f.id === 'u-diana')
  assert.ok(dianaInDirectory)
  assert.equal(dianaInDirectory.avg, 88)
  assert.equal(dianaInDirectory.best, 92)
  assert.equal(dianaInDirectory.recentResults.length, 2)

  // Alice, Bob, and Charlie finish the multiplayer match
  await aliceCtrl.finishMatchPlayer(match.id, { score: 85, correct: 85, total: 100, timeUsedSec: 1200 })
  await bobCtrl.finishMatchPlayer(match.id, { score: 90, correct: 90, total: 100, timeUsedSec: 1500 })
  const finalMatch = await charlieCtrl.finishMatchPlayer(match.id, { score: 85, correct: 85, total: 100, timeUsedSec: 950 })

  assert.equal(finalMatch.status, 'finished')
  const ranked = rankMatchPlayers(finalMatch.players)
  assert.equal(ranked[0].userId, 'u-bob') // 90%
  assert.equal(ranked[1].userId, 'u-charlie') // 85% in 950s beats 85% in 1200s
  assert.equal(ranked[2].userId, 'u-alice') // 85% in 1200s
  assert.equal(ranked[3].userId, 'u-diana') // declined

  aliceCtrl.destroy()
  bobCtrl.destroy()
  charlieCtrl.destroy()
  dianaCtrl.destroy()
})

/* ------------------------------------------------------------------
   Regression: "แข่งขันกับเพื่อน" ต้องเห็นเพื่อนทุกคนในระบบ ไม่ใช่แค่ตัวเอง
   ------------------------------------------------------------------ */

const uid = (n) => `00000000-0000-0000-0000-00000000000${n}`

function mockClient({ profiles = [], profilesError = null, directory = null, directoryError = null } = {}) {
  const make = (result) => {
    const q = {
      select: () => q,
      order: () => q,
      limit: () => q,
      in: () => q,
      upsert: () => Promise.resolve({ error: null }),
      then: (res, rej) => Promise.resolve(result).then(res, rej),
    }
    return q
  }
  return {
    from(table) {
      if (table === 'friend_profiles') return make({ data: profiles, error: profilesError })
      return make({ data: [], error: null })
    },
    rpc() {
      return Promise.resolve({ data: directory, error: directoryError })
    },
    channel() {
      return { on() { return this }, subscribe() { return this }, track: () => Promise.resolve(), send() {} }
    },
    removeChannel() {},
  }
}

test('บัญชีต่างคนที่ตั้งชื่อซ้ำกันต้องไม่ถูกยุบหายจากรายชื่อเพื่อน', async () => {
  localStorage.data.clear()
  const duplicateName = 'ผู้เข้าสอบ'
  const client = mockClient({
    profiles: [
      { user_id: uid(1), display_name: duplicateName, stats: { count: 1, avg: 50, best: 50 }, updated_at: '2026-11-10T01:00:00Z' },
      { user_id: uid(2), display_name: duplicateName, stats: { count: 2, avg: 60, best: 70 }, updated_at: '2026-11-10T02:00:00Z' },
      { user_id: uid(3), display_name: duplicateName, stats: { count: 3, avg: 70, best: 90 }, updated_at: '2026-11-10T03:00:00Z' },
      { user_id: uid(4), display_name: 'เพื่อนสี่', stats: { count: 0, avg: 0, best: 0 }, updated_at: '2026-11-10T04:00:00Z' },
    ],
  })
  let latest = null
  const ctrl = createArenaController({
    userId: uid(1),
    userName: duplicateName,
    getResults: () => [],
    onChange: (s) => { latest = s },
    client,
  })
  await new Promise((r) => setTimeout(r, 50))

  assert.equal(latest.friends.length, 4, 'ทุกบัญชีต้องมีแถวของตัวเอง แม้ชื่อจะซ้ำกัน')
  assert.equal(latest.friends.filter((f) => f.isMe).length, 1)
  ctrl.destroy()
})

test('โปรไฟล์หลายโปรไฟล์ในเครื่องเดียวกันต้องขึ้นครบ ไม่ยุบเหลือแค่ของตัวเอง', async () => {
  localStorage.data.clear()
  localStorage.setItem(
    'bacc-user:u-alice:bacc2569:profiles',
    JSON.stringify([
      { id: 'p1', name: 'อลิซ' },
      { id: 'p2', name: 'เพื่อนร่วมเครื่อง 1' },
      { id: 'p3', name: 'เพื่อนร่วมเครื่อง 2' },
    ]),
  )
  let latest = null
  const ctrl = createArenaController({
    userId: 'u-alice',
    userName: 'อลิซ',
    profileId: 'p1',
    getResults: () => [],
    onChange: (s) => { latest = s },
    client: null,
  })
  await new Promise((r) => setTimeout(r, 30))

  const names = latest.friends.map((f) => f.name)
  assert.equal(latest.friends.length, 3, `expected 3 friends, got ${JSON.stringify(names)}`)
  assert.ok(latest.friends.find((f) => f.name === 'อลิซ' && f.isMe))
  assert.ok(latest.friends.find((f) => f.name === 'เพื่อนร่วมเครื่อง 1'))
  assert.ok(latest.friends.find((f) => f.name === 'เพื่อนร่วมเครื่อง 2'))
  ctrl.destroy()
})

test('ถ้าตาราง friend_profiles มีแค่ตัวเอง ระบบจะดึงรายชื่อจาก RPC สำรองให้ครบ', async () => {
  localStorage.data.clear()
  const me = { user_id: uid(1), display_name: 'อลิซ', stats: { count: 1, avg: 70, best: 70 }, updated_at: '2026-11-10T01:00:00Z' }
  const client = mockClient({
    profiles: [me],
    directory: [
      me,
      { user_id: uid(2), display_name: 'บ็อบ', stats: { count: 2, avg: 80, best: 85 }, updated_at: '2026-11-10T02:00:00Z' },
      { user_id: uid(3), display_name: 'ชาร์ลี', stats: { count: 0, avg: 0, best: 0 }, updated_at: '2026-11-10T03:00:00Z' },
    ],
  })
  let latest = null
  const ctrl = createArenaController({
    userId: uid(1),
    userName: 'อลิซ',
    getResults: () => [],
    onChange: (s) => { latest = s },
    client,
  })
  await new Promise((r) => setTimeout(r, 80))

  assert.equal(latest.friends.length, 3)
  assert.equal(latest.directory.source, 'cloud-rpc')
  assert.equal(latest.directory.cloudCount, 3)
  assert.equal(latest.directory.error, null)
  ctrl.destroy()
})

test('ถ้าดึงรายชื่อจากคลาวด์ไม่สำเร็จ ต้องรายงานสถานะให้ผู้ใช้เห็น ไม่เงียบ', async () => {
  localStorage.data.clear()
  const client = mockClient({
    profiles: [],
    profilesError: { code: '42501', message: 'permission denied for table friend_profiles' },
    directory: null,
    directoryError: { message: 'permission denied for function list_friend_directory' },
  })
  let latest = null
  const ctrl = createArenaController({
    userId: uid(1),
    userName: 'อลิซ',
    getResults: () => [],
    onChange: (s) => { latest = s },
    client,
  })
  await new Promise((r) => setTimeout(r, 80))

  assert.ok(latest.directory.error, 'ต้องมีข้อความบอกว่าซิงก์ไม่สำเร็จ')
  assert.equal(latest.directory.syncing, false)
  ctrl.destroy()
})
