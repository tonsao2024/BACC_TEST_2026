import { useState } from 'react'
import { supabase, loginEmail } from '../lib/supabase.js'
import Icon from './Icons.jsx'

export default function AuthGate({ onRegistrationStart, onRegistrationSuccess, onRegistrationFailure }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || !/^\d{8,12}$/.test(pin)) return setError('กรอกชื่อและ PIN ตัวเลข 8–12 หลัก')
    if (mode === 'register' && pin !== confirm) return setError('PIN ยืนยันไม่ตรงกัน')
    setBusy(true); setError('')
    if (mode === 'register') onRegistrationStart({ name: name.trim().replace(/\s+/g, ' '), pin })
    try {
      const email = await loginEmail(name)
      const response = mode === 'register'
        ? await supabase.auth.signUp({ email, password: pin, options: { data: { display_name: name.trim().replace(/\s+/g, ' ') } } })
        : await supabase.auth.signInWithPassword({ email, password: pin })
      if (response.error) throw response.error
      if (!response.data.session) throw new Error('ชื่อผู้ใช้นี้อาจมีอยู่แล้ว กรุณาเข้าสู่ระบบ')
      if (mode === 'register') onRegistrationSuccess(response.data.session)
    } catch (err) {
      if (mode === 'register') onRegistrationFailure()
      setError(err.message?.includes('already registered') ? 'ชื่อนี้มีผู้ใช้งานแล้ว กรุณาเข้าสู่ระบบหรือเลือกชื่ออื่น' : mode === 'login' ? 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบชื่อและ PIN หรือการเชื่อมต่ออินเทอร์เน็ต' : (err.message || 'ไม่สามารถสมัครได้ กรุณาลองใหม่'))
    } finally { setBusy(false) }
  }
  return <div className="gate"><div className="gate__blob gate__blob--1" /><div className="gate__blob gate__blob--2" />
    <form className="gate__card" onSubmit={submit}>
      <div className="gate__mark"><Icon name="award" size={26} /></div>
      <p className="gate__eyebrow">BACC EXAM 2569</p><h1 className="gate__title">{mode === 'login' ? 'ยินดีต้อนรับ' : 'สร้างบัญชี'}</h1>
      <p className="gate__desc">ใช้ชื่อและ PIN เดิมเพื่อทำข้อสอบต่อบนอุปกรณ์อื่น ระบบจะจำการเข้าสู่ระบบบนเครื่องนี้</p>
      <label className="field"><span className="field__label">ชื่อผู้ใช้งาน</span><input className="field__input" value={name} onChange={e => setName(e.target.value)} maxLength={60} required autoComplete="username" placeholder="ชื่อที่ต้องการใช้เข้าสู่ระบบ" /></label>
      <label className="field"><span className="field__label">PIN (ตัวเลข 8–12 หลัก)</span><input className="field__input" type="password" inputMode="numeric" pattern="[0-9]{8,12}" maxLength={12} value={pin} onChange={e => setPin(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {mode === 'register' && <label className="field"><span className="field__label">ยืนยัน PIN</span><input className="field__input" type="password" inputMode="numeric" value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={12} required autoComplete="new-password" /></label>}
      {error && <p role="alert" className="gate__alert">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}</button>
      <button type="button" className="btn btn--soft btn--block" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setPin(''); setConfirm('') }}>{mode === 'login' ? 'ผู้ใช้ใหม่ · สร้างบัญชี' : 'มีบัญชีแล้ว · เข้าสู่ระบบ'}</button>
      <p className="gate__note"><Icon name="lock" size={14} /> จดจำชื่อและ PIN ไว้ให้ดี หากลืมจะไม่สามารถกู้บัญชีหรือประวัติเดิมได้ ต้องสมัครใหม่ · ไม่ควรใช้ PIN ซ้ำกับบริการสำคัญ</p>
    </form></div>
}
