import { useMemo, useState } from 'react'
import Icon from './Icons.jsx'
import { Sheet } from './ui.jsx'
import { humanTime } from '../lib/storage.js'

const initial = (name = '') => (name.trim()[0] || 'ผ').toUpperCase()

/* ============================================================
   ProfileGate — หน้าแรกระบุชื่อผู้เข้าทดสอบ
   ============================================================ */
export function ProfileGate({ profiles = [], onCreate, onUse }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  const submit = (e) => {
    e.preventDefault()
    if (!trimmed) return
    onCreate(trimmed)
  }

  return (
    <div className="gate">
      <div className="gate__blob gate__blob--1" />
      <div className="gate__blob gate__blob--2" />
      <div className="gate__blob gate__blob--3" />

      <form className="gate__card" onSubmit={submit}>
        <div className="gate__mark">
          <Icon name="award" size={26} />
        </div>
        <p className="gate__eyebrow">BACC EXAM 2569</p>
        <h1 className="gate__title">ยินดีต้อนรับ</h1>
        <p className="gate__desc">
          ระบุชื่อ–นามสกุลของผู้เข้าทดสอบ ระบบจะจำชื่อนี้ไว้ให้อัตโนมัติในครั้งถัดไป
          และเก็บประวัติการทำข้อสอบแยกตามรายชื่อ
        </p>

        <label className="field">
          <span className="field__label">ชื่อ–นามสกุลผู้เข้าทดสอบ</span>
          <input
            className="field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น สมชาย ใจดี"
            maxLength={60}
            autoFocus
            aria-label="ชื่อผู้เข้าทดสอบ"
          />
        </label>

        <button className="btn btn--primary btn--block" type="submit" disabled={!trimmed}>
          <Icon name="play" size={18} />
          เริ่มใช้งาน
        </button>

        {profiles.length > 0 && (
          <div className="gate__existing">
            <span className="gate__existing-label">หรือกลับมาใช้งานในชื่อเดิม</span>
            <div className="gate__chips">
              {profiles.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip chip--profile"
                  onClick={() => onUse(p.id)}
                >
                  <span className="avatar avatar--xs">{initial(p.name)}</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="gate__note">
          <Icon name="lock" size={14} />
          ข้อมูลทั้งหมดถูกจัดเก็บไว้ในเครื่องของคุณเท่านั้น
        </p>
      </form>
    </div>
  )
}

/* ============================================================
   AccountSheet — สลับผู้ใช้ / ธีม / สถิติ
   ============================================================ */
export function AccountSheet({
  profile,
  profiles = [],
  results = [],
  theme = 'light',
  settings = { instantReveal: true },
  onToggleInstantReveal,
  syncPanel = null,
  onClose,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onClear,
  onToggleTheme,
}) {
  const [tab, setTab] = useState('me')
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [draftName, setDraftName] = useState(profile?.name || '')

  const stats = useMemo(() => {
    if (!results.length) return { count: 0, avg: 0, time: 0, best: 0 }
    const avg = results.reduce((s, r) => s + (r.score || 0), 0) / results.length
    const time = results.reduce((s, r) => s + (r.timeUsedSec || 0), 0)
    return {
      count: results.length,
      avg: Math.round(avg),
      time,

      best: Math.round(Math.max(...results.map((r) => r.score || 0))),
    }
  }, [results])

  return (
    <Sheet onClose={onClose} title="บัญชีของฉัน">
      <div className="acct">
        <div className="acct__head">
          <span className="avatar avatar--lg">{initial(profile?.name)}</span>
          <div className="acct__id">
            {editing ? (
              <div className="acct__rename">
                <input
                  className="field__input field__input--sm"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={60}
                  aria-label="แก้ไขชื่อ"
                />
                <button
                  className="btn btn--sm btn--primary"
                  type="button"
                  onClick={() => {
                    const v = draftName.trim()
                    if (v) onRename(v)
                    setEditing(false)
                  }}
                >
                  บันทึก
                </button>
              </div>
            ) : (
              <>
                <b className="acct__name">{profile?.name}</b>
                <span className="acct__meta">
                  ผู้เข้าทดสอบ · {results.length} ครั้งที่ทำแล้ว
                </span>
              </>
            )}
          </div>
          {!editing && (
            <div className="acct__head-actions">
              <button
                className="btn btn--soft btn--xs"
                type="button"
                onClick={() => setTab('profiles')}
                title="สลับไปบัญชีอื่น"
              >
                <Icon name="user" size={12} /> สลับบัญชี
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={() => {
                  setDraftName(profile?.name || '')
                  setEditing(true)
                }}
                aria-label="แก้ไขชื่อ"
              >
                <Icon name="edit" size={17} />
              </button>
            </div>
          )}
        </div>

        <div className="acct__stats">
          <div className="acct__stat">
            <b>{stats.count}</b>
            <span>ครั้งที่ทำ</span>
          </div>
          <div className="acct__stat">
            <b>{stats.avg}</b>
            <span>คะแนนเฉลี่ย</span>
          </div>
          <div className="acct__stat">
            <b>{stats.best}</b>
            <span>ดีที่สุด</span>
          </div>
          <div className="acct__stat">
            <b>{stats.time ? humanTime(stats.time) : '0 น.'}</b>
            <span>เวลารวม</span>
          </div>
        </div>

        <div className="seg seg--inline" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'me'}
            className={`seg__item ${tab === 'me' ? 'is-on' : ''}`}
            onClick={() => setTab('me')}
          >
            การตั้งค่า
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profiles'}
            className={`seg__item ${tab === 'profiles' ? 'is-on' : ''}`}
            onClick={() => setTab('profiles')}
          >
            สลับผู้ใช้ ({profiles.length})
          </button>
        </div>

        {tab === 'me' ? (
          <div className="acct__panel">
            <div className="acct__row">
              <div className="acct__row-text">
                <b>โหมดการแสดงผล</b>
                <span>สลับระหว่างโหมดสว่างและโหมดมืด</span>
              </div>
              <button
                type="button"
                className={`switch ${theme === 'dark' ? 'is-on' : ''}`}
                onClick={onToggleTheme}
                aria-label="สลับโหมดมืด/สว่าง"
                aria-pressed={theme === 'dark'}
              >
                <span className="switch__knob">
                  <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={13} />
                </span>
              </button>
            </div>

            <div className="acct__row">
              <div className="acct__row-text">
                <b>เฉลยทันทีเมื่อเลือกคำตอบ</b>
                <span>แสดงคำตอบที่ถูกและคำอธิบายละเอียดทันทีที่เลือก</span>
              </div>
              <button
                type="button"
                className={`switch ${settings.instantReveal ? 'is-on' : ''}`}
                onClick={onToggleInstantReveal}
                aria-label="สลับการเฉลยทันที"
                aria-pressed={settings.instantReveal}
              >
                <span className="switch__knob">
                  <Icon name={settings.instantReveal ? 'eye' : 'lock'} size={13} />
                </span>
              </button>
            </div>

            {syncPanel}

            <button
              type="button"
              className={`acct__link ${confirming === 'clear' ? 'acct__link--danger' : ''}`}
              onClick={() => {
                if (confirming === 'clear') {
                  setConfirming(null)
                  onClear()
                  return
                }
                setConfirming('clear')
              }}
            >
              <Icon name="trash" size={17} />
              {confirming === 'clear'
                ? 'แตะอีกครั้งเพื่อยืนยันล้างประวัติทั้งหมด'
                : 'ล้างประวัติการทำข้อสอบของฉัน'}
            </button>
            <button
              type="button"
              className={`acct__link ${confirming === 'delete' ? 'acct__link--danger' : ''}`}
              onClick={() => {
                if (profiles.length <= 1 && confirming !== 'delete') return
                if (confirming === 'delete') {
                  setConfirming(null)
                  onDelete()
                  return
                }
                setConfirming('delete')
              }}
              disabled={profiles.length <= 1}
            >
              <Icon name="close" size={17} />
              {confirming === 'delete'
                ? 'แตะอีกครั้งเพื่อยืนยันลบโปรไฟล์'
                : 'ลบโปรไฟล์นี้และประวัติทั้งหมด'}
            </button>
            <p className="acct__hint">
              ประวัติแต่ละชื่อถูกแยกออกจากกัน แม้จะใช้เครื่องเดียวกันหรือทำชุดข้อสอบเดียวกัน
              — และเมื่อเชื่อมต่อ GitHub ข้อมูลจะถูกเก็บไว้บนคลาวด์ของคุณ
            </p>
          </div>
        ) : (
          <div className="acct__panel">
            <ul className="profile-list">
              {profiles.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`profile-item ${p.id === profile?.id ? 'is-active' : ''}`}
                    onClick={() => {
                      if (p.id !== profile?.id) onSwitch(p.id)
                    }}
                  >
                    <span className="avatar">{initial(p.name)}</span>
                    <span className="profile-item__name">
                      <b>{p.name}</b>
                      <i>{p.id === profile?.id ? 'กำลังใช้งาน' : 'แตะเพื่อสลับ'}</i>
                    </span>
                    {p.id === profile?.id && <Icon name="check" size={18} />}
                  </button>
                </li>
              ))}
            </ul>

            <div className="acct__add">
              <input
                className="field__input field__input--sm"
                placeholder="เพิ่มชื่อผู้เข้าทดสอบใหม่"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
                aria-label="ชื่อผู้เข้าทดสอบใหม่"
              />
              <button
                type="button"
                className="btn btn--sm btn--primary"
                disabled={!newName.trim()}
                onClick={() => {
                  onCreate(newName.trim())
                  setNewName('')
                }}
              >
                <Icon name="plus" size={16} />
                เพิ่ม
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
