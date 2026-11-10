import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getPart, RECRUITMENT_NOTICE, SOURCE_FILES } from './data/index.js'
import {
  clearResults,
  createProfile,
  deleteAttempt,
  deleteProfile,
  deleteResult,
  deleteSet,
  getAttempt,
  getCurrentProfile,
  getProfiles,
  exportSnapshot,
  getSets,
  getSettings,
  getTheme,
  listAttempts,
  legacyProfiles,
  importLegacyProfile,
  loadResults,
  renameProfile,
  makeShareCode,
  saveAttempt,
  saveResult,
  saveSet,
  saveSettings,
  setCurrentProfile,
  setTheme,
  uidPublic,
} from './lib/storage.js'
import { generateExam, newSeed } from './lib/generator.js'
import Home from './components/Home.jsx'
import PartDetail from './components/PartDetail.jsx'
import Quiz from './components/Quiz.jsx'
import Result from './components/Result.jsx'
import History from './components/History.jsx'
import Sources from './components/Sources.jsx'
import ExamBuilder from './components/ExamBuilder.jsx'
import DocReader from './components/DocReader.jsx'
import { ProfileGate } from './components/Profile.jsx'
import Icon from './components/Icons.jsx'
import { Toast, Sheet } from './components/ui.jsx'

const fileNameFor = (part) => {
  const file = SOURCE_FILES.find((f) => f.id === part.file)
  return file ? `${file.name}.pdf` : null
}

export default function App({ cloudSync, onCloudSignOut, onCloudRetry, onDiscardLocal }) {
  const [profiles, setProfiles] = useState(() => getProfiles())
  const [profile, setProfile] = useState(() => getCurrentProfile())
  const [results, setResults] = useState(() => {
    const p = getCurrentProfile()
    return p ? loadResults(p.id) : []
  })
  const [attempts, setAttempts] = useState(() => {
    const p = getCurrentProfile()
    return p ? listAttempts(p.id) : []
  })
  const [sets, setSets] = useState(() => getSets())
  const [theme, setThemeState] = useState(() => getTheme())
  const [settings, setSettings] = useState(() => getSettings())

  const [view, setView] = useState('home')
  const [partId, setPartId] = useState(null)
  const [activeResult, setActiveResult] = useState(null)
  const [session, setSession] = useState(null)
  const [doc, setDoc] = useState(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [legacyId, setLegacyId] = useState('')
  const [toast, setToast] = useState(null)
  const [stack, setStack] = useState([])
  const toastTimer = useRef(null)

  /* ---------------- theme ---------------- */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const showToast = useCallback((message, icon = 'checkCircle') => {
    setToast({ message, icon })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  /* ---------------- data refresh ---------------- */
  const refreshProfileData = useCallback((pid) => {
    setResults(pid ? loadResults(pid) : [])
    setAttempts(pid ? listAttempts(pid) : [])
  }, [])

  useEffect(() => {
    refreshProfileData(profile?.id)
  }, [profile?.id, refreshProfileData])

  const navigate = useCallback(
    (nextView, payload = {}) => {
      setStack((prev) => [...prev, { view, partId, activeResult }])
      setView(nextView)
      if ('partId' in payload) setPartId(payload.partId)
      if ('result' in payload) setActiveResult(payload.result)
      window.scrollTo(0, 0)
    },
    [view, partId, activeResult],
  )

  const goHome = useCallback(() => {
    setStack([])
    setView('home')
    setPartId(null)
    setActiveResult(null)
    setSession(null)
    window.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    setStack((prev) => {
      if (!prev.length) {
        setView('home')
        setSession(null)
        return prev
      }
      const last = prev[prev.length - 1]
      setView(last.view)
      setPartId(last.partId)
      setActiveResult(last.activeResult)
      if (last.view !== 'quiz') setSession(null)
      return prev.slice(0, -1)
    })
  }, [])

  /* ---------------- exam construction ---------------- */
  const buildPartExam = useCallback((id) => {
    const part = getPart(id)
    if (!part) return null
    return {
      key: `part:${id}`,
      kind: 'part',
      title: part.title,
      label: `พาร์ท ${part.label}`,
      partId: id,
      partLabel: part.label,
      partTitle: part.title,
      color: part.color,
      minutes: part.minutes,
      questions: part.questions,
      sections: null,
    }
  }, [])

  const buildSetExam = useCallback((set) => {
    const gen = generateExam({ seed: set.seed, sizeKey: set.sizeKey, name: set.name })
    return {
      key: `set:${set.seed}:${set.sizeKey}`,
      kind: 'set',
      title: set.name,
      label: 'ชุดสอบเสมือนจริง',
      setName: set.name,
      setId: set.id,
      seed: set.seed,
      sizeKey: set.sizeKey,
      color: '#2563EB',
      minutes: gen.minutes,
      questions: gen.questions,
      sections: gen.sections.map(({ key, label, count, points, color }) => ({
        key,
        label,
        count,
        points,
        color,
      })),
      partLabel: 'ชุดสอบเสมือนจริง',
      partTitle: set.name,
    }
  }, [])

  const openExam = useCallback(
    (exam, { fresh = false } = {}) => {
      if (!exam || !profile) return
      if (fresh) deleteAttempt(profile.id, exam.key)
      const attempt = fresh ? null : getAttempt(profile.id, exam.key)
      setStack((prev) => [...prev, { view, partId, activeResult }])
      setSession({ exam, attempt })
      setPartId(exam.partId || null)
      setView('quiz')
      window.scrollTo(0, 0)
    },
    [activeResult, partId, profile, view],
  )

  const startPart = useCallback(
    (id, fresh = false) => {
      const exam = buildPartExam(id)
      openExam(exam, { fresh })
    },
    [buildPartExam, openExam],
  )

  const startSet = useCallback(
    (set, opts = {}) => openExam(buildSetExam(set), opts),
    [buildSetExam, openExam],
  )

  const resumeAttempt = useCallback(
    (attempt) => {
      if (!attempt) return
      if (attempt.kind === 'set') {
        startSet(
          {
            id: attempt.setId,
            seed: attempt.seed,
            sizeKey: attempt.sizeKey,
            name: attempt.title,
          },
          { fresh: false },
        )
      } else if (attempt.partId) {
        startPart(attempt.partId, false)
      }
    },
    [startPart, startSet],
  )

  /* ---------------- attempt persistence ---------------- */
  const handleSaveAttempt = useCallback(
    (attempt) => {
      if (!profile || !attempt) return
      saveAttempt(profile.id, attempt)
      setAttempts(listAttempts(profile.id))
    },
    [profile],
  )

  const handleFinish = useCallback(
    (result) => {
      if (!profile) return
      saveResult(profile.id, result)
      if (session?.exam?.key) deleteAttempt(profile.id, session.exam.key)
      setResults(loadResults(profile.id))
      setAttempts(listAttempts(profile.id))
      setActiveResult(result)
      setView('result')
      window.scrollTo({ top: 0 })
    },
    [profile, session],
  )

  /* ---------------- profiles ---------------- */
  const handleCreateProfile = useCallback(
    (name) => {
      const p = createProfile(name)
      setProfiles(getProfiles())
      setProfile(p)
      setCurrentProfile(p.id)
      setView('home')
      setStack([])
      setAccountOpen(false)
      showToast(`ยินดีต้อนรับ ${p.name}`)
    },
    [showToast],
  )

  const handleSwitchProfile = useCallback(
    (id) => {
      const p = getProfiles().find((x) => x.id === id)
      if (!p) return
      setCurrentProfile(id)
      setProfile(p)
      setProfiles(getProfiles())
      setAccountOpen(false)
      setStack([])
      setView('home')
      setSession(null)
      showToast(`สลับมาที่ ${p.name} แล้ว`)
    },
    [showToast],
  )

  const handleRenameProfile = useCallback(
    (name) => {
      if (!profile) return
      const next = renameProfile(profile.id, name)
      setProfile(next)
      setProfiles(getProfiles())
      showToast('บันทึกชื่อผู้เข้าทดสอบแล้ว')
    },
    [profile, showToast],
  )

  const handleDeleteProfile = useCallback(() => {
    if (!profile) return
    const rest = deleteProfile(profile.id)
    setProfiles(getProfiles())
    setAccountOpen(false)
    if (rest.length) {
      setProfile(rest[0])
      setCurrentProfile(rest[0].id)
      setView('home')
      showToast('ลบโปรไฟล์แล้ว')
    } else {
      setProfile(null)
      setResults([])
      setAttempts([])
      setView('home')
    }
  }, [profile, showToast])

  const handleClearResults = useCallback(() => {
    if (!profile) return
    clearResults(profile.id)
    setResults([])
    showToast('ล้างประวัติการทำข้อสอบแล้ว', 'trash')
  }, [profile, showToast])

  /* ---------------- exam sets ---------------- */
  const handleCreateSet = useCallback(
    ({ name, seed, sizeKey }) => {
      const set = {
        id: uidPublic('set'),
        seed,
        sizeKey,
        name,
        createdAt: new Date().toISOString(),
        owner: profile?.name || 'ผู้เข้าทดสอบ',
        ownerId: profile?.id || null,
      }
      saveSet(set)
      setSets(getSets())
      return set
    },
    [profile],
  )

  const handleImportSet = useCallback(
    (parsed) => {
      const exists = getSets().find((s) => s.seed === parsed.seed && s.sizeKey === parsed.sizeKey)
      if (exists) return null
      const set = {
        id: uidPublic('set'),
        ...parsed,
        createdAt: new Date().toISOString(),
        owner: 'แชร์จากเพื่อน',
        ownerId: null,
        imported: true,
      }
      saveSet(set)
      setSets(getSets())
      return set
    },
    [profile],
  )

  const handleDeleteSet = useCallback(
    (id) => {
      deleteSet(id)
      setSets(getSets())
      if (profile) {
        const target = sets.find((s) => s.id === id)
        if (target) deleteAttempt(profile.id, `set:${target.seed}:${target.sizeKey}`)
        setAttempts(listAttempts(profile.id))
      }
      showToast('ลบชุดข้อสอบแล้ว', 'trash')
    },
    [profile, sets, showToast],
  )

  /* ---------------- result actions ---------------- */
  const handleDeleteResult = useCallback(
    (id) => {
      if (!profile) return
      deleteResult(profile.id, id)
      setResults(loadResults(profile.id))
      showToast('ลบผลการทดสอบแล้ว', 'trash')
    },
    [profile, showToast],
  )

  const retry = useCallback(
    (result) => {
      if (result.kind === 'set' && result.seed) {
        startSet(
          {
            id: result.setId,
            seed: result.seed,
            sizeKey: result.sizeKey,
            name: result.setName || 'ชุดสอบเสมือนจริง',
          },
          { fresh: true },
        )
      } else if (result.partId) {
        startPart(result.partId, true)
      }
    },
    [startPart, startSet],
  )

  const toggleInstantReveal = useCallback(() => {
    const next = saveSettings({ instantReveal: !getSettings().instantReveal })
    setSettings(next)
  }, [])

  /* ---------------- misc ---------------- */
  const part = useMemo(() => (partId ? getPart(partId) : null), [partId])
  const attemptForPart = useMemo(
    () => (partId ? attempts.find((a) => a.key === `part:${partId}`) : null),
    [attempts, partId],
  )

  useEffect(() => {
    document.title =
      view === 'quiz' && session
        ? `กำลังทำข้อสอบ · ${session.exam.title} · BACC Exam 2569`
        : view === 'result' && activeResult
          ? `ผลสอบ ${Math.round(activeResult.score)} คะแนน · BACC Exam 2569`
          : 'BACC Exam 2569 · ศูนย์ทดสอบออนไลน์ ธ.ก.ส.'
  }, [view, session, activeResult])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  const board = useMemo(() => {
    const list = getProfiles().map((p) => {
      const rs = loadResults(p.id)
      const scores = rs.map((r) => r.score)
      const count = scores.length
      return {
        id: p.id,
        name: p.name,
        count,
        best: count ? Math.round(Math.max(...scores)) : 0,
        avg: count ? Math.round(scores.reduce((a, b) => a + b, 0) / count) : 0,
        isMe: p.id === profile?.id,
      }
    })
    return list.sort((a, b) => b.avg - a.avg || b.best - a.best || b.count - a.count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, results, profile])

  const copyToClipboard = (value) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value)
        return true
      }
    } catch {
      /* fall through */
    }
    return false
  }

  const createMatchSet = useCallback(() => {
    const set =
      sets[0] ||
      handleCreateSet({
        name: `ชุดแข่งกับเพื่อน ${new Date().toLocaleDateString('th-TH')}`,
        seed: newSeed(),
        sizeKey: 'mini',
      })
    const code = makeShareCode(set)
    const ok = copyToClipboard(code)
    showToast(
      ok ? `คัดลอกรหัสชุดแข่งแล้ว · ส่งให้เพื่อนได้เลย` : `รหัสชุดแข่ง: ${code}`,
      ok ? 'checkCircle' : 'info',
    )
    return set
  }, [sets, handleCreateSet, showToast])

  if (!profile) {
    return (
      <div className="app">
        <div className="app__decor" aria-hidden="true">
          <div className="blob blob--1" />
          <div className="blob blob--2" />
          <div className="blob blob--3" />
        </div>
        <ProfileGate
          profiles={profiles}
          onCreate={handleCreateProfile}
          onUse={handleSwitchProfile}
        />
        {toast && <Toast message={toast.message} icon={toast.icon} />}
      </div>
    )
  }


  const navItems = [
    { key: 'home', label: 'หน้าแรก', icon: 'home' },
    { key: 'parts', label: 'พาร์ทสอบ', icon: 'grid' },
    { key: 'sets', label: 'ชุดสอบ', icon: 'layers' },
    { key: 'history', label: 'ผลสอบ', icon: 'award' },
    { key: 'sources', label: 'เอกสาร', icon: 'docs' },
  ]

  const navActive =
    view === 'home'
      ? 'home'
      : view === 'history'
        ? 'history'
        : view === 'sources'
          ? 'sources'
          : view === 'sets'
            ? 'sets'
            : 'parts'

  const handleNav = (key) => {
    if (key === 'home') goHome()
    if (key === 'parts') {
      goHome()
      setTimeout(() => {
        document.getElementById('parts-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
    if (key === 'sets') navigate('sets')
    if (key === 'history') navigate('history')
    if (key === 'sources') navigate('sources')
  }

  const showNav = view === 'home' || view === 'history' || view === 'sources' || view === 'sets'

  return (
    <div className="app">
      <div className="app__decor" aria-hidden="true">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
      </div>

      <main
        className={`app__scroll ${showNav ? '' : 'app__scroll--flush'}`}
        key={`${view}-${partId || ''}-${session?.exam.key || ''}`}
      >
        {view === 'home' && (
          <Home
            results={results}
            attempts={attempts}
            sets={sets}
            name={profile.name}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenPart={(id) => navigate('part', { partId: id })}
            onStartMock={() => navigate('part', { partId: 'mock' })}
            onOpenHistory={() => navigate('history')}
            onOpenSources={() => navigate('sources')}
            onReadAnnouncement={() => setDoc(RECRUITMENT_NOTICE)}
            onOpenResult={(r) => navigate('result', { result: r })}
            onOpenAccount={() => setAccountOpen(true)}
            onOpenSets={() => navigate('sets')}
            onNewSet={() => navigate('sets')}
            sync={cloudSync}
            board={board}
            onChallenge={createMatchSet}
            onCreateMatch={createMatchSet}
            onResume={resumeAttempt}
          />
        )}

        {view === 'part' && part && (
          <PartDetail
            part={part}
            results={results}
            attempt={attemptForPart}
            onBack={back}
            onStart={(id) => startPart(id, false)}
            onRestart={(id) => startPart(id, true)}
            onReadDoc={(d) => setDoc(d)}
            onOpenSources={() => navigate('sources')}
            partFileName={fileNameFor(part)}
          />
        )}

        {view === 'quiz' && session && (
          <Quiz
            key={session.exam.key}
            exam={session.exam}
            name={profile.name}
            attempt={session.attempt}
            instantReveal={settings.instantReveal}
            onToggleInstantReveal={toggleInstantReveal}
            onSave={handleSaveAttempt}
            onExit={() => back()}
            onFinish={handleFinish}
            cloudSync={cloudSync}
          />
        )}

        {view === 'result' && activeResult && (
          <Result
            result={activeResult}
            part={activeResult.partId ? getPart(activeResult.partId) : null}
            profileName={profile.name}
            onHome={goHome}
            onRetry={retry}
            onHistory={() => navigate('history')}
            onOpenSources={() => navigate('sources')}
            onToast={showToast}
            onRename={handleRenameProfile}
          />
        )}

        {view === 'history' && (
          <History
            results={results}
            profileName={profile.name}
            onBack={back}
            onOpenResult={(r) => navigate('result', { result: r })}
            onDelete={handleDeleteResult}
            onClear={handleClearResults}
            onBrowseParts={goHome}
            onToast={showToast}
            onOpenAccount={() => setAccountOpen(true)}
          />
        )}

        {view === 'sources' && (
          <Sources onBack={back} onToast={showToast} onReadDoc={(f) => setDoc(f)} />
        )}

        {view === 'sets' && (
          <ExamBuilder
            sets={sets}
            attempts={attempts}
            profile={profile}
            onBack={back}
            onCreate={handleCreateSet}
            onStart={startSet}
            onResume={resumeAttempt}
            onDelete={handleDeleteSet}
            onImport={handleImportSet}
            onToast={showToast}
            onReadDoc={() => navigate('sources')}
            onOpenAccount={() => setAccountOpen(true)}
          />
        )}

        <footer className="copyright">
          © 2569 Ton Skywalker · ห้ามเผยแพร่ (All rights reserved)
        </footer>
      </main>

      <nav className={`bottom-nav ${showNav ? '' : 'is-mobile-hidden'}`} aria-label="เมนูหลัก">
          <div className="bottom-nav__inner">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${navActive === item.key ? 'is-active' : ''}`}
                onClick={() => handleNav(item.key)}
              >
                <Icon name={item.icon} size={19} stroke={navActive === item.key ? 2.1 : 1.8} />
                {item.label}
              </button>
            ))}
        </div>
      </nav>

      {toast && <Toast message={toast.message} icon={toast.icon} />}

      {accountOpen && (
        <Sheet onClose={() => setAccountOpen(false)} title="บัญชีของฉัน">
          <div className="acct__panel">
            <h2>{profile.name}</h2>
            <p>ข้อมูลและประวัติการสอบบันทึกแยกตามบัญชีนี้</p>
            <p role="status">{cloudSync?.status === 'saved' || cloudSync?.status === 'idle' ? '☁️ ซิงก์กับ Supabase แล้ว' : cloudSync?.error || 'กำลังบันทึกข้อมูล…'}</p>
            {cloudSync?.status === 'error' && <><button className="btn btn--soft" onClick={onCloudRetry}>ลองซิงก์อีกครั้ง</button>{cloudSync.error?.includes('อุปกรณ์อื่น') && <button className="btn btn--soft" onClick={onDiscardLocal}>ใช้ข้อมูลล่าสุดจากคลาวด์</button>}</>}
            <button className="btn btn--soft btn--block" onClick={toggleTheme}>เปลี่ยนธีม</button>
            <button className="btn btn--soft btn--block" onClick={toggleInstantReveal}>เฉลยทันที: {settings.instantReveal ? 'เปิด' : 'ปิด'}</button>
            {legacyProfiles().length > 0 && <div style={{ margin: '16px 0' }}>
              <p>มีประวัติจากแอปเดิมบนเครื่องนี้ เลือกโปรไฟล์ที่ต้องการนำเข้า (ข้อมูลเดิมจะไม่ถูกลบ)</p>
              <select className="field__input" value={legacyId} onChange={e => setLegacyId(e.target.value)} aria-label="เลือกโปรไฟล์เดิม">
                <option value="">เลือกโปรไฟล์เดิม</option>{legacyProfiles().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="btn btn--soft btn--block" disabled={!legacyId} onClick={() => {
                if (!window.confirm('นำเข้าประวัติของโปรไฟล์ที่เลือกมายังบัญชีนี้ใช่หรือไม่?')) return
                if (importLegacyProfile(legacyId, profile.id)) { setResults(loadResults(profile.id)); setAttempts(listAttempts(profile.id)); setSets(getSets()); showToast('นำเข้าประวัติแล้ว กำลังซิงก์'); setLegacyId('') }
              }}>นำเข้าประวัติจากเครื่องนี้</button>
            </div>}
            <button className="btn btn--soft btn--block" onClick={onCloudSignOut}>ออกจากระบบ / สลับบัญชี</button>
            <p className="acct__hint">ใช้ชื่อและ PIN เดิมเมื่อเข้าสู่ระบบบนอุปกรณ์อื่น รอให้ซิงก์เสร็จก่อนเปลี่ยนอุปกรณ์</p>
          </div>
        </Sheet>
      )}

      {doc &&
        createPortal(
          <DocReader
            doc={doc}
            files={SOURCE_FILES}
            onSelect={(f) => setDoc(f)}
            onClose={() => setDoc(null)}
          />,
          document.body,
        )}
    </div>
  )
}
