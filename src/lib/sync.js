/* ============================================================
   Sync manager — ดึง/รวม/ส่งข้อมูลขึ้น GitHub พร้อมสถานะให้ UI ใช้
   ============================================================ */

import { exportSnapshot, importSnapshot, mergeSnapshots } from './storage.js'
import { fetchRemote, getGithubConfig, pushRemote, saveGithubConfig } from './remote.js'

let sha = null
let pushing = false
let queued = false
const listeners = new Set()

let state = { status: 'off', at: null, error: null, mode: null }

const emit = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn(state))
}

export const subscribeSync = (fn) => {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

export const getSyncState = () => state

export function resetSyncState() {
  sha = null
  emit({ status: 'off', at: null, error: null, mode: null })
}

/** ดึงข้อมูลล่าสุดจาก GitHub แล้วรวมกับข้อมูลในเครื่อง */
export async function pullAndMerge() {
  const cfg = getGithubConfig()
  if (!cfg) {
    emit({ status: 'off', error: null, mode: null })
    return false
  }
  emit({ status: 'loading', error: null, mode: cfg.mode })
  try {
    const remote = await fetchRemote(cfg)
    if (remote) {
      sha = remote.sha
      if (remote.data) importSnapshot(mergeSnapshots(exportSnapshot(), remote.data))
    }
    emit({ status: 'idle', at: new Date().toISOString(), mode: cfg.mode })
    return true
  } catch (err) {
    emit({ status: 'error', error: err.message, mode: cfg.mode })
    return false
  }
}

/** ส่งข้อมูลขึ้น GitHub (มีคิวและจัดการ conflict 409 ให้อัตโนมัติ) */
export async function pushNow() {
  const cfg = getGithubConfig()
  if (!cfg) {
    emit({ status: 'off', error: null })
    return false
  }
  if (pushing) {
    queued = true
    return false
  }
  pushing = true
  emit({ status: 'saving', error: null, mode: cfg.mode })
  try {
    const res = await pushRemote(cfg, exportSnapshot(), sha)
    sha = res.sha
    if (res.gistId && res.gistId !== cfg.gistId) saveGithubConfig({ ...cfg, gistId: res.gistId })
    emit({ status: 'saved', at: new Date().toISOString(), error: null, mode: cfg.mode })
    return true
  } catch (err) {
    if (err.status === 409) {
      try {
        const remote = await fetchRemote(cfg)
        if (remote) sha = remote.sha
        const res = await pushRemote(cfg, exportSnapshot(), sha)
        sha = res.sha
        emit({ status: 'saved', at: new Date().toISOString(), error: null, mode: cfg.mode })
        return true
      } catch (err2) {
        emit({ status: 'error', error: err2.message, mode: cfg.mode })
        return false
      }
    }
    emit({ status: 'error', error: err.message, mode: cfg.mode })
    return false
  } finally {
    pushing = false
    if (queued) {
      queued = false
      setTimeout(() => {
        pushNow()
      }, 500)
    }
  }
}

let timer = null
/** หน่วงเวลาก่อนส่ง เพื่อรวมการเปลี่ยนแปลงหลายครั้งให้ส่งครั้งเดียว */
export function schedulePush(delay = 1500) {
  const cfg = getGithubConfig()
  if (!cfg) return
  clearTimeout(timer)
  emit({ status: 'pending', mode: cfg.mode })
  timer = setTimeout(() => {
    pushNow()
  }, delay)
}
