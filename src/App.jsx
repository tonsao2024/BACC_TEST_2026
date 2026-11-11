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
import { normalizeSectionKeys } from './lib/special.js'
import Home from './components/Home.jsx'
import PartDetail from './components/PartDetail.jsx'
import Quiz from './components/Quiz.jsx'
import Result from './components/Result.jsx'
import History from './components/History.jsx'
import Sources from './components/Sources.jsx'
import ExamBuilder from './components/ExamBuilder.jsx'
import DocReader from './components/DocReader.jsx'
import FriendArena, {
  ChallengePopup,
  CreateMatchSheet,
  FriendStatsSheet,
} from './components/FriendArena.jsx'
import {
  computePublicStats,
  createArenaController,
  getChallengePref,
  shouldShowChallengePopup,
} from './lib/friends.js'
import { ProfileGate } from './components/Profile.jsx'
import Icon from './components/Icons.jsx'
import { Toast, Sheet } from './components/ui.jsx'

const fileNameFor = (part) => {
  if (part?.sourceFile) return part.sourceFile
  const file = SOURCE_FILES.find((f) => f.id === part.file)
  return file ? `${file.name}.pdf` : null
}

export default function App({ authUser = null, cloudSync, onCloudSignOut, onCloudRetry, onDiscardLocal }) {
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
  const [arena, setArena] = useState(() => ({
    friends: [],
    matches: [],
    pref: getChallengePref(authUser?.id || profile?.id || null),
    directory: null,
  }))
  const [homeInspectId, setHomeInspectId] = useState(null)
  const [homeCreateForIds, setHomeCreateForIds] = useState(null)
  const [popupTick, setPopupTick] = useState(0)
  const arenaRef = useRef(null)
  const toastTimer = useRef(null)
  const meId = authUser?.id || profile?.id || null

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
  const buildPartExam = useCallback((id, opts = {}) => {
    const part = getPart(id)
    if (!part) return null

    /* ---------- ข้อสอบพิเศษ: เลือกทำเฉพาะรายวิชาย่อย (section) ได้ ---------- */
    if (part.group === 'special') {
      const sectionKeys = normalizeSectionKeys(part, opts.sectionKeys)
      const only = sectionKeys.length
        ? part.questions.filter((q) => sectionKeys.includes(q.sectionKey))
        : part.questions
      const totalCount = only.length
      const count =
        opts.count && opts.count !== 'all' ? Math.min(Number(opts.count), totalCount) : 'all'
      const isRandom = Boolean(opts.isRandom || opts.batchIndex === 'random')
      const batchIndex = typeof opts.batchIndex === 'number' ? opts.batchIndex : 0
      const secSuffix = sectionKeys.length ? `:sec:${sectionKeys.join('+')}` : ''
      let questions = only
      let key = `part:${id}${secSuffix}`
      let batchLabel = `ทั้งหมด (${totalCount} ข้อ)`

      if (count !== 'all') {
        if (isRandom) {
          const seed = opts.seed || Math.random().toString(36).slice(2, 8)
          const indexed = only.map((q, idx) => ({ q, idx }))
          indexed.sort((a, b) => {
            const ha = (a.idx * 16807 + seed.charCodeAt(0) * 31) % 2147483647
            const hb = (b.idx * 16807 + seed.charCodeAt(0) * 31) % 2147483647
            return ha - hb
          })
          questions = indexed.slice(0, count).map((item) => item.q)
          key = `part:${id}${secSuffix}:random:${count}:${seed}`
          batchLabel = `สุ่ม ${count} ข้อ`
        } else {
          const start = batchIndex * count
          const end = Math.min(totalCount, start + count)
          questions = only.slice(start, end)
          key = `part:${id}${secSuffix}:b${count}:${batchIndex}`
          batchLabel = `ชุดที่ ${batchIndex + 1} (ข้อ ${start + 1}–${end})`
        }
      }

      const secKey = sectionKeys.length === 1 ? sectionKeys[0] : null
      const activeSections = (part.sections || [])
        .filter((s) => !secKey || s.key === secKey)
        .filter((s) => questions.some((q) => q.sectionKey === s.key))
        .map((s) => ({
          key: s.key,
          label: s.label,
          color: s.color,
          count: questions.filter((q) => q.sectionKey === s.key).length,
          points: s.points || part.officialPoints || questions.length,
        }))

      return {
        key: opts.examKey || key,
        kind: 'part',
        title: count === 'all' ? part.title : `${part.title} · ${batchLabel}`,
        label: `พาร์ท ${part.label}${count === 'all' ? '' : ` · ${batchLabel}`}`,
        partId: id,
        partLabel: part.label,
        partTitle: part.title,
        color: part.color,
        minutes: Math.max(5, Math.round((part.minutes * questions.length) / (part.questions.length || 1))),
        questions,
        sections: activeSections.length > 1 ? activeSections : null,
        pointsPerQuestion: (part.officialPoints || questions.length) / (part.questions.length || 1),
        subsetCount: count,
        batchIndex: isRandom ? 'random' : batchIndex,
        batchLabel,
        subsetSeed: isRandom ? (opts.seed || key.split(':').pop()) : null,
      }
    }

    const totalCount = part.questions.length
    const count = opts.count && opts.count !== 'all' ? Math.min(Number(opts.count), totalCount) : 'all'
    const isRandom = Boolean(opts.isRandom || opts.batchIndex === 'random')
    const batchIndex = typeof opts.batchIndex === 'number' ? opts.batchIndex : 0

    let questions = part.questions
    let key = `part:${id}`
    let batchLabel = `ทั้งหมด (${totalCount} ข้อ)`

    if (count !== 'all') {
      if (isRandom) {
        const seed = opts.seed || Math.random().toString(36).slice(2, 8)
        const indexed = part.questions.map((q, idx) => ({ q, idx }))
        indexed.sort((a, b) => {
          const ha = (a.idx * 16807 + seed.charCodeAt(0) * 31) % 2147483647
          const hb = (b.idx * 16807 + seed.charCodeAt(0) * 31) % 2147483647
          return ha - hb
        })
        questions = indexed.slice(0, count).map((item) => item.q)
        key = `part:${id}:random:${count}:${seed}`
        batchLabel = `สุ่ม ${count} ข้อ`
      } else {
        const start = batchIndex * count
        const end = Math.min(totalCount, start + count)
        questions = part.questions.slice(start, end)
        key = `part:${id}:b${count}:${batchIndex}`
        batchLabel = `ชุดที่ ${batchIndex + 1} (ข้อ ${start + 1}–${end})`
      }
    }

    return {
      key: opts.examKey || key,
      kind: 'part',
      title: count === 'all' ? part.title : `${part.title} · ${batchLabel}`,
      label: `พาร์ท ${part.label}${count === 'all' ? '' : ` · ${batchLabel}`}`,
      partId: id,
      partLabel: part.label,
      partTitle: part.title,
      color: part.color,
      minutes: part.minutes,
      questions,
      sections: null,
      subsetCount: count,
      batchIndex: isRandom ? 'random' : batchIndex,
      batchLabel,
      subsetSeed: isRandom ? (opts.seed || key.split(':').pop()) : null,
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
    (id, fresh = false, opts = {}) => {
      const exam = buildPartExam(id, opts)
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
      if (attempt.matchId && arenaRef.current) {
        const m = arenaRef.current.getMatch(attempt.matchId)
        if (m) {
          const exam =
            m.examSpec?.kind === 'part'
              ? {
                  ...buildPartExam(m.examSpec.partId || 'mock'),
                  key: `match:${m.id}`,
                  matchId: m.id,
                  label: `แข่งกับเพื่อน · ${m.examSpec.label || ''}`,
                }
              : {
                  ...buildSetExam({
                    id: m.examSpec?.setId || m.id,
                    seed: m.examSpec?.seed || attempt.seed,
                    sizeKey: m.examSpec?.sizeKey || attempt.sizeKey || 'mini',
                    name: m.examSpec?.setName || m.title,
                  }),
                  key: `match:${m.id}`,
                  matchId: m.id,
                  label: 'แข่งกับเพื่อน · ชุดสอบเสมือนจริง',
                }
          openExam(exam, { fresh: false })
          return
        }
      }
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
        startPart(attempt.partId, false, {
          count: attempt.subsetCount,
          batchIndex: attempt.batchIndex,
          seed: attempt.subsetSeed,
          examKey: attempt.key,
        })
      }
    },
    [buildPartExam, buildSetExam, openExam, startPart, startSet],
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
      if (result.matchId) {
        arenaRef.current?.finishMatchPlayer(result.matchId, result)
      }
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
        startPart(result.partId, true, {
          count: result.subsetCount,
          batchIndex: result.batchIndex,
          seed: result.subsetSeed,
        })
      }
    },
    [startPart, startSet],
  )

  const handleNextBatch = useCallback(
    (result) => {
      if (!result.partId) return
      const nextBatchIndex = (typeof result.batchIndex === 'number' ? result.batchIndex : 0) + 1
      startPart(result.partId, true, {
        count: result.subsetCount,
        batchIndex: nextBatchIndex,
      })
    },
    [startPart],
  )

  const toggleInstantReveal = useCallback(() => {
    const next = saveSettings({ instantReveal: !getSettings().instantReveal })
    setSettings(next)
  }, [])

  /* ---------------- misc ---------------- */
  const part = useMemo(() => (partId ? getPart(partId) : null), [partId])
  const attemptForPart = useMemo(
    () =>
      partId
        ? attempts.find((a) => a.key === `part:${partId}`) ||
          attempts.find((a) => a.key && a.key.startsWith(`part:${partId}`)) ||
          null
        : null,
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

  /* ---------------- Friend Arena live controller ---------------- */
  useEffect(() => {
    if (!meId || !profile) return undefined
    const ctrl = createArenaController({
      userId: meId,
      userName: profile.name || authUser?.user_metadata?.display_name || 'ผู้เข้าสอบ',
      profileId: profile.id,
      getResults: () => loadResults(profile.id),
      onChange: (next) => setArena(next),
    })
    arenaRef.current = ctrl
    return () => {
      ctrl.destroy()
      if (arenaRef.current === ctrl) arenaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, profile?.id])

  useEffect(() => {
    if (!arenaRef.current || !profile) return
    arenaRef.current.syncMyProfile({
      name: profile.name,
      activity: view === 'quiz' ? 'in-quiz' : 'online',
    })
  }, [profile, results, view])

  const refreshFriends = useCallback(
    () => arenaRef.current?.pullFromDatabase?.(),
    [],
  )

  useEffect(() => {
    const until = arena.pref?.snoozedUntil || 0
    if (!until || arena.pref?.muted || until >= Number.MAX_SAFE_INTEGER) return undefined
    const wait = until - Date.now()
    if (wait <= 0) return undefined
    const id = setTimeout(() => setPopupTick((t) => t + 1), wait + 60)
    return () => clearTimeout(id)
  }, [arena.pref?.snoozedUntil, arena.pref?.muted])

  const meStats = useMemo(() => computePublicStats(results), [results])

  const board = useMemo(() => {
    if (arena.friends.length > 0) return arena.friends
    const list = getProfiles().map((p) => {
      const rs = loadResults(p.id)
      const st = computePublicStats(rs)
      return {
        id: p.id,
        name: p.name,
        online: p.id === profile?.id,
        activity: 'online',
        isMe: p.id === profile?.id,
        ...st,
      }
    })
    return list.sort((a, b) => b.avg - a.avg || b.best - a.best || b.count - a.count)
  }, [arena.friends, profiles, results, profile])

  const buildMatchExam = useCallback(
    (match) => {
      if (!match?.examSpec) return null
      const spec = match.examSpec
      const base =
        spec.kind === 'part'
          ? buildPartExam(spec.partId || 'mock')
          : buildSetExam({
              id: spec.setId || match.id,
              seed: spec.seed || newSeed(),
              sizeKey: spec.sizeKey || 'mini',
              name: spec.setName || spec.title || match.title,
            })
      if (!base) return null
      return {
        ...base,
        key: `match:${match.id}`,
        matchId: match.id,
        label: `แข่งกับเพื่อน · ${base.label}`,
      }
    },
    [buildPartExam, buildSetExam],
  )

  const startMatchExam = useCallback(
    async (match) => {
      if (!match) return
      await arenaRef.current?.startMatch(match.id)
      const exam = buildMatchExam(match)
      if (exam) openExam(exam, { fresh: false })
    },
    [buildMatchExam, openExam],
  )

  const handleMatchProgress = useCallback((matchId, progress) => {
    arenaRef.current?.updateMatchProgress(matchId, progress)
  }, [])

  const handleCreateArenaMatch = useCallback(
    async (payload) => {
      if (!arenaRef.current) return
      const match = await arenaRef.current.createMatch(payload)
      const count = payload.invitedFriends?.length || 0
      showToast(
        count > 0
          ? `ส่งคำท้าให้เพื่อน ${count} คนแล้ว! รอเพื่อนกดตอบรับได้เลย`
          : 'เปิดห้องแข่งขันแล้ว!',
      )
      if (view !== 'friends') navigate('friends')
      return match
    },
    [navigate, showToast, view],
  )

  const handleAcceptChallenge = useCallback(
    async (match) => {
      if (!arenaRef.current || !match) return
      const updated = await arenaRef.current.acceptMatch(match.id)
      showToast(`ยอมรับคำท้าจาก ${match.hostName} แล้ว! ลุยเลย 🔥`)
      if (updated?.status === 'active') {
        await startMatchExam(updated)
      } else if (view !== 'friends') {
        navigate('friends')
      }
    },
    [navigate, showToast, startMatchExam, view],
  )

  const handleDeclineChallenge = useCallback(
    async (match) => {
      if (!arenaRef.current || !match) return
      const res = await arenaRef.current.declineMatch(match.id)
      const cnt = res?.pref?.declineCount || 1
      if (res?.pref?.muted) {
        showToast('กดไม่แข่งครบ 3 ครั้งแล้ว · ระบบจะไม่เด้งเตือนคำท้าอีก', 'info')
      } else {
        showToast(`เลือกไม่แข่ง (${cnt}/3 ครั้ง) · หากเพื่อนยังรอจะเตือนอีก ${3 - cnt} ครั้ง`, 'info')
      }
    },
    [showToast],
  )

  const pendingChallengeMatch = useMemo(
    () =>
      arena.matches.find((m) =>
        shouldShowChallengePopup({
          match: m,
          userId: meId,
          pref: arena.pref,
          activeMatchId: session?.exam?.matchId || null,
          now: Date.now(),
        }),
      ) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arena.matches, arena.pref, meId, session?.exam?.matchId, popupTick],
  )

  const homeInspectFriend = useMemo(
    () => board.find((f) => f.id === homeInspectId) || null,
    [board, homeInspectId],
  )

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
    view === 'home' || view === 'friends'
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

  const showNav =
    view === 'home' ||
    view === 'friends' ||
    view === 'history' ||
    view === 'sources' ||
    view === 'sets'

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
            matches={arena.matches}
            meId={meId}
            directory={arena.directory}
            onRefreshFriends={refreshFriends}
            onOpenArena={() => {
              refreshFriends()
              navigate('friends')
            }}
            onChallengeFriend={(f) => setHomeCreateForIds(f?.id ? [f.id] : [])}
            onInspectFriend={(f) => setHomeInspectId(f?.id || null)}
            onCreateMatch={() => setHomeCreateForIds([])}
            onOpenMatch={() => navigate('friends')}
            onResume={resumeAttempt}
          />
        )}

        {view === 'friends' && (
          <FriendArena
            friends={board}
            matches={arena.matches}
            sets={sets}
            meId={meId}
            meStats={meStats}
            challengePref={arena.pref}
            directory={arena.directory}
            onRefreshFriends={refreshFriends}
            onBack={back}
            onCreateMatch={handleCreateArenaMatch}
            onAcceptMatch={handleAcceptChallenge}
            onStartMatchExam={startMatchExam}
            onNudgeMatch={(id) => {
              arenaRef.current?.nudgeMatch(id)
              showToast('ส่งสัญญาณเตือนเพื่อนที่ยังไม่ตอบรับแล้ว 🔔')
            }}
            onInviteMore={(id, extra) => {
              arenaRef.current?.inviteFriendsToMatch(id, extra)
              showToast(`ส่งคำท้าเพิ่มให้ ${extra.map((x) => x.name).join(', ')} แล้ว!`)
            }}
            onCancelMatch={(id) => {
              arenaRef.current?.cancelMatch(id)
              showToast('ปิดห้องแข่งขันแล้ว', 'info')
            }}
            onResetMute={() => {
              arenaRef.current?.resetMute()
              showToast('เปิดรับการแจ้งเตือนคำท้าจากเพื่อนอีกครั้งแล้ว 🔔')
            }}
          />
        )}

        {view === 'part' && part && (
          <PartDetail
            part={part}
            results={results}
            attempt={attemptForPart}
            attempts={attempts}
            onBack={back}
            onStart={(id, opts) => startPart(id, false, opts)}
            onRestart={(id, opts) => startPart(id, true, opts)}
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
            match={
              session.exam.matchId
                ? arena.matches.find((m) => m.id === session.exam.matchId) || null
                : null
            }
            meId={meId}
            onMatchProgress={handleMatchProgress}
          />
        )}

        {view === 'result' && activeResult && (
          <Result
            result={activeResult}
            part={activeResult.partId ? getPart(activeResult.partId) : null}
            profileName={profile.name}
            match={
              activeResult.matchId
                ? arena.matches.find((m) => m.id === activeResult.matchId) || null
                : null
            }
            meId={meId}
            allFriends={board}
            onOpenArena={() => navigate('friends')}
            onHome={goHome}
            onRetry={retry}
            onNextBatch={handleNextBatch}
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

      {pendingChallengeMatch && !homeInspectFriend && (
        <ChallengePopup
          match={pendingChallengeMatch}
          declineCount={arena.pref?.declineCount || 0}
          onAccept={handleAcceptChallenge}
          onDecline={handleDeclineChallenge}
          onInspectHost={(uid) => setHomeInspectId(uid)}
        />
      )}

      {homeInspectFriend && (
        <FriendStatsSheet
          friend={homeInspectFriend}
          meStats={meStats}
          onClose={() => setHomeInspectId(null)}
          onChallengeFriend={(f) => setHomeCreateForIds(f?.id ? [f.id] : [])}
        />
      )}

      {homeCreateForIds !== null && (
        <CreateMatchSheet
          friends={board}
          sets={sets}
          initialSelectedIds={homeCreateForIds}
          onClose={() => setHomeCreateForIds(null)}
          onSubmit={(payload) => {
            setHomeCreateForIds(null)
            handleCreateArenaMatch(payload)
          }}
        />
      )}

      {accountOpen && (
        <Sheet onClose={() => setAccountOpen(false)} title="บัญชีของฉัน">
          <div className="acct__panel acct__panel--stack">
            <div className="acct__head">
              <span className="avatar avatar--lg">{profile.name ? profile.name.trim().charAt(0).toUpperCase() : 'ผ'}</span>
              <div className="acct__id">
                <b className="acct__name">{profile.name}</b>
                <span className="acct__meta">ข้อมูลและประวัติการสอบบันทึกแยกตามบัญชีนี้</span>
              </div>
            </div>
            <p role="status" className="acct__sync-status">
              {cloudSync?.status === 'saved' || cloudSync?.status === 'idle'
                ? '☁️ ซิงก์กับ Supabase แล้ว'
                : cloudSync?.error || 'กำลังบันทึกข้อมูล…'}
            </p>
            {cloudSync?.status === 'error' && (
              <div className="acct__sync-actions">
                <button className="btn btn--soft btn--sm" onClick={onCloudRetry}>ลองซิงก์อีกครั้ง</button>
                {cloudSync.error?.includes('อุปกรณ์อื่น') && (
                  <button className="btn btn--soft btn--sm" onClick={onDiscardLocal}>ใช้ข้อมูลล่าสุดจากคลาวด์</button>
                )}
              </div>
            )}
            <button className="btn btn--soft btn--block" onClick={toggleTheme}>
              เปลี่ยนธีม ({theme === 'dark' ? 'โหมดมืด' : 'โหมดสว่าง'})
            </button>
            <button className="btn btn--soft btn--block" onClick={toggleInstantReveal}>
              เฉลยทันที: {settings.instantReveal ? 'เปิด' : 'ปิด'}
            </button>
            {legacyProfiles().length > 0 && (
              <div className="acct__legacy">
                <p>มีประวัติจากแอปเดิมบนเครื่องนี้ เลือกโปรไฟล์ที่ต้องการนำเข้า (ข้อมูลเดิมจะไม่ถูกลบ)</p>
                <select
                  className="field__input"
                  value={legacyId}
                  onChange={e => setLegacyId(e.target.value)}
                  aria-label="เลือกโปรไฟล์เดิม"
                >
                  <option value="">เลือกโปรไฟล์เดิม</option>
                  {legacyProfiles().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  className="btn btn--soft btn--block"
                  disabled={!legacyId}
                  onClick={() => {
                    if (!window.confirm('นำเข้าประวัติของโปรไฟล์ที่เลือกมายังบัญชีนี้ใช่หรือไม่?')) return
                    if (importLegacyProfile(legacyId, profile.id)) {
                      setResults(loadResults(profile.id))
                      setAttempts(listAttempts(profile.id))
                      setSets(getSets())
                      showToast('นำเข้าประวัติแล้ว กำลังซิงก์')
                      setLegacyId('')
                    }
                  }}
                >
                  นำเข้าประวัติจากเครื่องนี้
                </button>
              </div>
            )}
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
