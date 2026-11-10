import { useEffect, useState } from 'react'
import Icon from './Icons.jsx'
import { fetchLogin, getGithubConfig, saveGithubConfig, testConnection } from '../lib/remote.js'
import { exportSnapshot } from '../lib/storage.js'

const STATUS = {
  off: { text: 'ยังไม่เชื่อมต่อ — เก็บข้อมูลในเครื่องนี้', tone: 'off' },
  idle: { text: 'พร้อมใช้งาน', tone: 'ok' },
  loading: { text: 'กำลังดึงข้อมูลจาก GitHub…', tone: 'busy' },
  pending: { text: 'มีการเปลี่ยนแปลง รอกำลังบันทึก…', tone: 'busy' },
  saving: { text: 'กำลังบันทึกขึ้น GitHub…', tone: 'busy' },
  saved: { text: 'บันทึกขึ้น GitHub แล้ว', tone: 'ok' },
  error: { text: 'ซิงก์ไม่สำเร็จ', tone: 'bad' },
}

const timeText = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const sum = (obj) => Object.values(obj || {}).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0)

export default function GitHubPanel({ sync, onSaved, onDisconnected, onToast }) {
  const saved = getGithubConfig()
  const snap = exportSnapshot()
  const counts = {
    profiles: (snap.profiles || []).length,
    results: sum(snap.results),
    attempts: sum(snap.attempts),
    sets: (snap.sets || []).length,
  }
  const settingText = `เฉลยทันที ${snap.settings?.instantReveal ? 'เปิด' : 'ปิด'} · ธีม ${
    snap.theme === 'dark' ? 'มืด' : 'สว่าง'
  }`
  const [editing, setEditing] = useState(!saved)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    mode: saved?.mode || 'gist',
    owner: saved?.owner || '',
    repo: saved?.repo || '',
    branch: saved?.branch || 'main',
    path: saved?.path || 'bacc-data.json',
    token: saved?.token || '',
    gistId: saved?.gistId || '',
  })

  useEffect(() => {
    if (saved) setEditing(false)
  }, [saved?.savedAt])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const status = STATUS[sync?.status] || STATUS.off

  const connect = async () => {
    setBusy('connect')
    setMessage(null)
    try {
      const cfg = saveGithubConfig(form)
      await testConnection(cfg)
      setBusy('pull')
      const ok = await onSaved?.()
      setEditing(false)
      setMessage(
        ok
          ? { tone: 'ok', text: 'เชื่อมต่อสำเร็จ — ข้อมูลถูกบันทึกขึ้น GitHub แล้ว' }
          : { tone: 'bad', text: 'เชื่อมต่อได้ แต่บันทึกไม่สำเร็จ ลองกดซิงก์อีกครั้ง' },
      )
      if (ok) onToast?.('เชื่อมต่อ GitHub และบันทึกข้อมูลแล้ว')
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message || 'เชื่อมต่อไม่สำเร็จ' })
    } finally {
      setBusy('')
    }
  }

  const test = async () => {
    setBusy('test')
    setMessage(null)
    try {
      const cfg = saveGithubConfig(form)
      const res = await testConnection(cfg)
      setMessage({ tone: 'ok', text: `เชื่อมต่อได้: ${res.login || res.detail}` })
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message })
    } finally {
      setBusy('')
    }
  }

  const syncNow = async () => {
    setBusy('sync')
    try {
      const ok = await onSaved?.()
      onToast?.(ok ? 'ซิงก์ข้อมูลล่าสุดแล้ว' : 'ซิงก์ไม่สำเร็จ', ok ? 'checkCircle' : 'info')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="gh">
      <div className="gh__head">
        <span className={`gh__dot is-${status.tone}`} />
        <div className="gh__head-text">
          <b>คลังข้อมูล GitHub</b>
          <span>
            {status.text}
            {sync?.status === 'saved' && sync?.at ? ` · ${timeText(sync.at)}` : ''}
          </span>
        </div>
        {saved && !editing && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={13} /> แก้ไข
          </button>
        )}
      </div>

      <div className="gh__data" aria-label="ข้อมูลที่จะบันทึก">
        <span>
          <Icon name="user" size={12} /> โปรไฟล์ <b>{counts.profiles}</b>
        </span>
        <span>
          <Icon name="chart" size={12} /> ประวัติผลสอบ <b>{counts.results}</b>
        </span>
        <span>
          <Icon name="clock" size={12} /> ทำค้าง <b>{counts.attempts}</b>
        </span>
        <span>
          <Icon name="layers" size={12} /> ชุดข้อสอบ <b>{counts.sets}</b>
        </span>
        <span className="is-wide">
          <Icon name="wand" size={12} /> การตั้งค่า · {settingText}
        </span>
      </div>

      {saved && !editing && (
        <>
          <div className="gh__meta">
            <span>
              <Icon name={saved.mode === 'gist' ? 'lock' : 'grid'} size={12} />
              {saved.mode === 'gist' ? 'secret gist' : `${saved.owner}/${saved.repo}`}
            </span>
            <span>
              <Icon name="docs" size={12} /> {saved.path}
            </span>
            {saved.mode === 'repo' && (
              <span>
                <Icon name="layers" size={12} /> {saved.branch}
              </span>
            )}
          </div>
          {sync?.status === 'error' && sync?.error && (
            <p className="gh__error">
              <Icon name="info" size={13} /> {sync.error}
            </p>
          )}
          <div className="gh__actions">
            <button
              type="button"
              className="btn btn--soft btn--sm"
              onClick={syncNow}
              disabled={busy === 'sync'}
            >
              <Icon name="refresh" size={14} /> {busy === 'sync' ? 'กำลังซิงก์…' : 'ซิงก์เดี๋ยวนี้'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                onDisconnected?.()
                setEditing(true)
                setMessage({ tone: 'ok', text: 'ยกเลิกการเชื่อมต่อแล้ว — ข้อมูลยังอยู่ในเครื่อง' })
              }}
            >
              <Icon name="close" size={14} /> ยกเลิกการเชื่อมต่อ
            </button>
          </div>
          <p className="gh__hint">
            เมื่อเชื่อมต่อแล้ว ข้อมูลจะถูกบันทึกอัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง
            (ผลสอบ ความคืบหน้า ชุดข้อสอบ และโปรไฟล์)
          </p>
        </>
      )}

      {editing && (
        <div className="gh__form">
          <div className="gh__modes">
            <button
              type="button"
              className={`gh__mode ${form.mode === 'gist' ? 'is-on' : ''}`}
              onClick={() => setForm((f) => ({ ...f, mode: 'gist' }))}
            >
              <b>Secret Gist · ง่ายสุด</b>
              <span>ใช้แค่ token — ระบบสร้าง gist ส่วนตัวให้</span>
            </button>
            <button
              type="button"
              className={`gh__mode ${form.mode === 'repo' ? 'is-on' : ''}`}
              onClick={() => setForm((f) => ({ ...f, mode: 'repo' }))}
            >
              <b>Repository</b>
              <span>เก็บไฟล์ JSON ใน repo ของคุณ</span>
            </button>
          </div>

          {form.mode === 'repo' ? (
            <div className="gh__grid">
              <label className="field field--tight">
                <span className="field__label">เจ้าของ (owner)</span>
                <span className="gh__owner">
                  <input className="field__input field__input--sm" value={form.owner} onChange={set('owner')} placeholder="tonsao2024" />
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={async () => {
                      setBusy('owner')
                      try {
                        const login = await fetchLogin({ ...form, token: form.token })
                        setForm((f) => ({ ...f, owner: login }))
                        setMessage({ tone: 'ok', text: `ใช้บัญชี ${login}` })
                      } catch (err) {
                        setMessage({ tone: 'bad', text: err.message })
                      } finally {
                        setBusy('')
                      }
                    }}
                    disabled={!form.token || busy === 'owner'}
                    title="เติมชื่อเจ้าของจาก token"
                  >
                    {busy === 'owner' ? '…' : 'ดึงชื่อ'}
                  </button>
                </span>
              </label>
              <label className="field field--tight">
                <span className="field__label">ชื่อ repository</span>
                <input className="field__input field__input--sm" value={form.repo} onChange={set('repo')} placeholder="BACC_TEST_2026" />
              </label>
              <label className="field field--tight">
                <span className="field__label">branch</span>
                <input className="field__input field__input--sm" value={form.branch} onChange={set('branch')} placeholder="main" />
              </label>
              <label className="field field--tight">
                <span className="field__label">path ของไฟล์</span>
                <input className="field__input field__input--sm" value={form.path} onChange={set('path')} placeholder="data/bacc-data.json" />
              </label>
            </div>
          ) : (
            <label className="field field--tight">
              <span className="field__label">Gist ID (เว้นว่างเพื่อสร้างใหม่)</span>
              <input className="field__input field__input--sm" value={form.gistId} onChange={set('gistId')} placeholder="สร้างอัตโนมัติเมื่อบันทึกครั้งแรก" />
            </label>
          )}

          <label className="field field--tight">
            <span className="field__label">Personal access token</span>
            <input
              className="field__input field__input--sm"
              type="password"
              value={form.token}
              onChange={set('token')}
              placeholder="ghp_… หรือ github_pat_…"
              spellCheck="false"
              autoComplete="off"
            />
          </label>

          <p className="gh__hint">
            {form.mode === 'gist' ? (
              <>
                สร้าง classic token ที่มีสิทธิ์ <b>gist</b> แล้ววางที่นี่ — กด “เชื่อมต่อและบันทึก”
                ระบบจะสร้าง gist ส่วนตัวให้อัตโนมัติ ไม่ต้องสร้าง repo เอง
              </>
            ) : (
              <>
                ใช้ fine-grained token สิทธิ์ <b>Contents: Read and write</b> เฉพาะ repo นี้
              </>
            )}{' '}
            · token เก็บไว้ในเบราว์เซอร์เครื่องนี้และส่งตรงถึง api.github.com เท่านั้น
          </p>

          {message && (
            <p className={`gh__msg is-${message.tone}`}>
              <Icon name={message.tone === 'ok' ? 'checkCircle' : 'info'} size={13} /> {message.text}
            </p>
          )}

          <div className="gh__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={test} disabled={Boolean(busy)}>
              <Icon name="target" size={14} /> ทดสอบการเชื่อมต่อ
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={connect}
              disabled={Boolean(busy) || !form.token}
            >
              <Icon name="download" size={14} />
              {busy ? 'กำลังเชื่อมต่อ…' : 'เชื่อมต่อและบันทึก'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
