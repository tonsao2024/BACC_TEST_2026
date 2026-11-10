import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as storage from '../src/lib/storage.js'

class MemoryStorage {
  data = new Map()
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null }
  setItem(key, value) { this.data.set(key, String(value)) }
  removeItem(key) { this.data.delete(key) }
}
globalThis.localStorage = new MemoryStorage()
globalThis.window = new EventTarget()
window.matchMedia = () => ({ matches: false })

test('isolated accounts restore attempts and history from a snapshot', () => {
  storage.setStorageScope('alice')
  const alice = storage.createProfile('Alice')
  storage.saveAttempt(alice.id, { key: 'part:one', answers: [1, null], idx: 1, remaining: 230 })
  storage.saveResult(alice.id, { id: 'r1', score: 80 })
  const snapshot = storage.exportSnapshot()
  storage.setStorageScope('bob')
  assert.equal(storage.getCurrentProfile(), null)
  const bob = storage.createProfile('Bob')
  assert.deepEqual(storage.loadResults(bob.id), [])
  storage.setStorageScope('new-device')
  storage.importSnapshot(snapshot)
  assert.equal(storage.getCurrentProfile().name, 'Alice')
  assert.deepEqual(storage.getAttempt(alice.id, 'part:one').answers, [1, null])
  assert.equal(storage.getAttempt(alice.id, 'part:one').remaining, 230)
  assert.equal(storage.loadResults(alice.id)[0].id, 'r1')
  storage.deleteAttempt(alice.id, 'part:one')
  storage.deleteResult(alice.id, 'r1')
  assert.deepEqual(storage.listAttempts(alice.id), [])
  assert.deepEqual(storage.loadResults(alice.id), [])
  storage.setStorageScope('alice')
  assert.equal(storage.listAttempts(alice.id).length, 1)
})

test('history is not truncated and legacy import is explicit and idempotent', () => {
  storage.setStorageScope('')
  const legacy = storage.createProfile('Old')
  storage.saveResult(legacy.id, { id: 'old', score: 70 })
  storage.saveAttempt(legacy.id, { key: 'part:old', answers: [2] })
  storage.setStorageScope('charlie')
  const profile = storage.createProfile('Charlie')
  for (let n = 0; n < 65; n++) storage.saveResult(profile.id, { id: `r${n}` })
  assert.equal(storage.loadResults(profile.id).length, 65)
  assert.equal(storage.importLegacyProfile(legacy.id, profile.id), true)
  assert.equal(storage.importLegacyProfile(legacy.id, profile.id), true)
  assert.equal(storage.loadResults(profile.id).length, 66)
  assert.deepEqual(storage.getAttempt(profile.id, 'part:old').answers, [2])
  assert.ok(storage.legacyProfiles().some(p => p.id === legacy.id))
})
