import { useCallback, useEffect, useRef, useState } from 'react'
import App from '../App.jsx'
import AuthGate from './AuthGate.jsx'
import PinReminder from './PinReminder.jsx'
import { supabase } from '../lib/supabase.js'
import { createProfile, exportSnapshot, getCurrentProfile, importSnapshot, setStorageScope } from '../lib/storage.js'

function AccountApp({ user, onSignOut }) {
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState({ status: 'loading', mode: 'cloud' })
  const [reload, setReload] = useState(0)
  const controller = useRef(null)

  useEffect(() => {
    let alive = true, timer, retryTimer, busy = false, generation = 0, blocked = false
    let revision = 0, dirty = false
    const metaKey = `bacc-cloud-meta:${user.id}`
    setStorageScope(user.id)
    const readMeta = () => { try { return JSON.parse(localStorage.getItem(metaKey) || '{}') } catch { return {} } }
    const meta = () => localStorage.setItem(metaKey, JSON.stringify({ revision, dirty }))
    const status = (s, error = null) => alive && setSync({ status: s, mode: 'cloud', error, at: s === 'saved' || s === 'idle' ? new Date().toISOString() : null })
    // Do not reset the timer on each quiz tick: continuous activity must still sync.
    const schedule = (delay = 1500) => { if (!timer) timer = setTimeout(() => { timer = null; push() }, delay) }
    const markDirty = () => { generation++; dirty = true; meta(); if (!blocked) { status('pending'); schedule() } }
    async function push() {
      if (!alive || !dirty || blocked || busy) return
      busy = true; const savingGeneration = generation
      status('saving')
      try {
        const data = exportSnapshot()
        let response
        if (revision === 0) {
          response = await supabase.from('exam_user_state').insert({ user_id: user.id, data, revision: 1 }).select('revision').maybeSingle()
        } else {
          response = await supabase.from('exam_user_state').update({ data, revision: revision + 1, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('revision', revision).select('revision').maybeSingle()
        }
        if (!alive) return
        if (response.error) {
          if (response.error.code === '23505') { blocked = true; status('error', 'ข้อมูลเปลี่ยนจากอุปกรณ์อื่น กรุณาเปิดเมนูบัญชี'); return }
          throw response.error
        }
        if (!response.data) { blocked = true; status('error', 'ข้อมูลเปลี่ยนจากอุปกรณ์อื่น กรุณาเปิดเมนูบัญชี'); return }
        revision = response.data.revision
        dirty = generation !== savingGeneration
        meta()
        status(dirty ? 'pending' : 'saved')
      } catch (e) {
        status('error', 'บันทึกไม่สำเร็จ ข้อมูลยังอยู่ในเครื่อง · จะลองใหม่อัตโนมัติ')
        retryTimer = setTimeout(() => { retryTimer = null; schedule(0) }, 10000)
      } finally { busy = false; if (dirty && !blocked && alive && !retryTimer) schedule() }
    }
    async function init() {
      setReady(false); status('loading')
      try {
        const { data: row, error } = await supabase.from('exam_user_state').select('data,revision').eq('user_id', user.id).maybeSingle()
        if (!alive) return
        if (error) throw error
        const saved = readMeta(); revision = saved.revision || 0; dirty = !!saved.dirty
        if (dirty && (row?.revision || 0) !== revision) {
          blocked = true; status('error', 'ข้อมูลเปลี่ยนจากอุปกรณ์อื่น กรุณาเปิดเมนูบัญชี')
        } else if (!dirty) {
          revision = row?.revision || 0
          if (row?.data) importSnapshot(row.data)
          status('idle')
        }
        if (!getCurrentProfile()) { createProfile(user.user_metadata?.display_name || 'ผู้เข้าสอบ'); dirty = true }
        meta()
        controller.current = {
          retry: () => { clearTimeout(retryTimer); retryTimer = null; schedule(0) },
          discardLocal: () => { localStorage.setItem(metaKey, JSON.stringify({ revision: 0, dirty: false })); setReload(x => x + 1) },
          canSignOut: () => !dirty && !busy && !blocked,
        }
        window.addEventListener('bacc-storage-change', markDirty)
        window.addEventListener('online', controller.current.retry)
        setReady(true)
        if (dirty && !blocked) schedule(0)
      } catch (e) { status('error', 'เชื่อมต่อ Supabase ไม่สำเร็จ โปรดตรวจสอบอินเทอร์เน็ต'); controller.current = null }
    }
    init()
    return () => { alive = false; clearTimeout(timer); clearTimeout(retryTimer); window.removeEventListener('bacc-storage-change', markDirty); if (controller.current) window.removeEventListener('online', controller.current.retry); controller.current = null }
  }, [user.id, reload])

  const signOut = async () => {
    if (!controller.current?.canSignOut()) { alert('ยังมีข้อมูลที่ไม่ได้ซิงก์ กรุณารอให้บันทึกสำเร็จก่อนออกจากระบบ'); return }
    await onSignOut()
  }
  if (!ready) return <div className="gate"><div className="gate__card"><h1 className="gate__title">กำลังเตรียมข้อมูล</h1><p role="status">{sync.error || 'กำลังดึงข้อมูลล่าสุดจาก Supabase…'}</p>{sync.error && <button className="btn btn--primary" onClick={() => setReload(x => x + 1)}>ลองอีกครั้ง</button>}</div></div>
  return <App key={`${user.id}-${reload}`} authUser={user} cloudSync={sync} onCloudSignOut={signOut} onCloudRetry={() => controller.current?.retry()} onDiscardLocal={() => { if (window.confirm('ข้อมูลที่ยังไม่ซิงก์ในเครื่องนี้จะถูกแทนที่ด้วยข้อมูลบนคลาวด์ ต้องการดำเนินการหรือไม่?')) controller.current?.discardLocal() }} />
}

export default function CloudApp() {
  const [session, setSession] = useState(undefined)
  // PIN exists only in React memory until the user acknowledges the reminder.
  const [registration, setRegistration] = useState(null)
  useEffect(() => {
    let alive = true, receivedAuthEvent = false
    supabase.auth.getSession().then(({ data }) => { if (alive && !receivedAuthEvent) setSession(data.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, value) => { if (alive) { receivedAuthEvent = true; setSession(value) } })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])
  const logout = useCallback(() => supabase.auth.signOut({ scope: 'local' }), [])
  if (registration?.complete) return <PinReminder name={registration.name} pin={registration.pin} onContinue={() => setRegistration(null)} />
  if (session === undefined && !registration) return <div className="gate"><div className="gate__card">กำลังตรวจสอบบัญชี…</div></div>
  // SIGNED_IN may arrive before signUp resolves. Keep the form mounted until
  // registration has succeeded or failed so the reminder cannot be skipped.
  if (!session || registration) return <AuthGate
    onRegistrationStart={(details) => setRegistration({ ...details, complete: false })}
    onRegistrationSuccess={(newSession) => { setSession(newSession); setRegistration((current) => current && { ...current, complete: true }) }}
    onRegistrationFailure={() => setRegistration(null)}
  />
  return <AccountApp key={session.user.id} user={session.user} onSignOut={logout} />
}
