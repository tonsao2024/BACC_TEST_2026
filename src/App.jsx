import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ALL_PARTS, getPart, SOURCE_FILES } from './data/index.js'
import { clearResults, loadName, loadResults, saveName, saveResult } from './lib/storage.js'
import Home from './components/Home.jsx'
import PartDetail from './components/PartDetail.jsx'
import Quiz from './components/Quiz.jsx'
import Result from './components/Result.jsx'
import History from './components/History.jsx'
import Sources from './components/Sources.jsx'
import Icon from './components/Icons.jsx'
import { Sheet, Toast } from './components/ui.jsx'

const fileNameFor = (part) =>
  SOURCE_FILES.find((f) => f.id === part.file)?.name
    ? `${SOURCE_FILES.find((f) => f.id === part.file).name}.pdf`
    : null

export default function App() {
  const [view, setView] = useState('home')
  const [partId, setPartId] = useState(null)
  const [activeResult, setActiveResult] = useState(null)
  const [results, setResults] = useState(() => loadResults())
  const [name, setName] = useState(() => loadName())
  const [nameSheet, setNameSheet] = useState(false)
  const [nameDraft, setNameDraft] = useState(name)
  const [toast, setToast] = useState(null)
  const [stack, setStack] = useState([])
  const toastTimer = useRef(null)

  const showToast = useCallback((message, icon = 'checkCircle') => {
    setToast({ message, icon })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

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
    window.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    setStack((prev) => {
      if (!prev.length) {
        setView('home')
        return prev
      }
      const last = prev[prev.length - 1]
      setView(last.view)
      setPartId(last.partId)
      setActiveResult(last.activeResult)
      return prev.slice(0, -1)
    })
  }, [])

  const startPart = useCallback(
    (id) => {
      setStack((prev) => [...prev, { view, partId: id, activeResult }])
      setPartId(id)
      setView('quiz')
      window.scrollTo(0, 0)
    },
    [view, activeResult],
  )

  const handleFinish = useCallback((result) => {
    saveResult(result)
    setResults(loadResults())
    setActiveResult(result)
    setView('result')
    window.scrollTo({ top: 0 })
  }, [])

  const part = useMemo(() => (partId ? getPart(partId) : null), [partId])

  useEffect(() => {
    document.title =
      view === 'quiz' && part
        ? `กำลังทำข้อสอบ · ${part.title} · BACC Exam 2569`
        : view === 'result' && activeResult
          ? `ผลสอบ ${activeResult.partLabel} · ${Math.round(activeResult.score)} คะแนน`
          : 'BACC Exam 2569 · ศูนย์ทดสอบออนไลน์ ธ.ก.ส.'
  }, [view, part, activeResult])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  const navItems = [
    { key: 'home', label: 'หน้าแรก', icon: 'home' },
    { key: 'parts', label: 'พาร์ทสอบ', icon: 'grid' },
    { key: 'history', label: 'ผลสอบ', icon: 'award' },
    { key: 'sources', label: 'เอกสาร', icon: 'docs' },
  ]

  const navActive =
    view === 'home' ? 'home' : view === 'history' ? 'history' : view === 'sources' ? 'sources' : 'parts'

  const handleNav = (key) => {
    if (key === 'home') goHome()
    if (key === 'parts') {
      goHome()
      setTimeout(() => {
        document.getElementById('parts-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
    if (key === 'history') navigate('history')
    if (key === 'sources') navigate('sources')
  }

  const showNav = view === 'home' || view === 'history' || view === 'sources'

  return (
    <div className="app">
      <div className="app__decor" aria-hidden="true">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
      </div>

      <main className={`app__scroll ${showNav ? '' : 'app__scroll--flush'}`} key={`${view}-${partId || ''}`}>
        {view === 'home' && (
          <Home
            results={results}
            name={name}
            onOpenPart={(id) => navigate('part', { partId: id })}
            onStartMock={() => navigate('part', { partId: 'mock' })}
            onOpenHistory={() => navigate('history')}
            onOpenSources={() => navigate('sources')}
            onOpenResult={(r) => navigate('result', { result: r })}
            onSetName={() => setNameSheet(true)}
          />
        )}

        {view === 'part' && part && (
          <PartDetail
            part={part}
            results={results}
            onBack={back}
            onStart={startPart}
            onOpenSources={() => navigate('sources')}
            partFileName={fileNameFor(part)}
          />
        )}

        {view === 'quiz' && part && (
          <Quiz part={part} name={name} onExit={back} onFinish={handleFinish} />
        )}

        {view === 'result' && activeResult && (
          <Result
            result={activeResult}
            part={getPart(activeResult.partId)}
            onHome={goHome}
            onRetry={startPart}
            onHistory={() => navigate('history')}
            onOpenSources={() => navigate('sources')}
            onToast={showToast}
          />
        )}

        {view === 'history' && (
          <History
            results={results}
            onBack={back}
            onOpenResult={(r) => navigate('result', { result: r })}
            onClear={() => {
              clearResults()
              setResults([])
            }}
            onBrowseParts={goHome}
            onToast={showToast}
          />
        )}

        {view === 'sources' && <Sources onBack={back} onToast={showToast} />}
      </main>

      {showNav && (
        <nav className="bottom-nav" aria-label="เมนูหลัก">
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
      )}

      {toast && <Toast message={toast.message} icon={toast.icon} />}

      {nameSheet && (
        <Sheet
          title="ตั้งชื่อผู้เข้าสอบ"
          desc="ชื่อนี้จะแสดงบนรายงานผลการทดสอบที่ดาวน์โหลด"
          onClose={() => setNameSheet(false)}
          actions={
            <>
              <button className="btn btn--ghost" onClick={() => setNameSheet(false)}>
                ยกเลิก
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  const v = nameDraft.trim()
                  saveName(v)
                  setName(v)
                  setNameSheet(false)
                  showToast('บันทึกชื่อผู้เข้าสอบแล้ว')
                }}
              >
                บันทึก
              </button>
            </>
          }
        >
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="เช่น นายสมชาย ใจดี"
            maxLength={60}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px 16px',
              borderRadius: 15,
              border: '1.5px solid var(--line)',
              fontSize: 14,
              outline: 'none',
              background: '#fbfaff',
            }}
          />
        </Sheet>
      )}
    </div>
  )
}
