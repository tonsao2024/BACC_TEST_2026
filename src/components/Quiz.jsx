import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { humanTime, mmss } from '../lib/storage.js'
import Icon from './Icons.jsx'
import { FigureModal, Sheet } from './ui.jsx'

const LETTERS = ['ก', 'ข', 'ค', 'ง']

const emptyAnswers = (n) => Array(n).fill(null)

export default function Quiz({
  exam,
  name,
  attempt,
  instantReveal = true,
  onToggleInstantReveal,
  onSave,
  onExit,
  onFinish,
  cloudSync,
  match = null,
  meId = null,
  onMatchProgress,
}) {
  const questions = exam.questions
  const total = questions.length
  const sections = exam.sections || null

  const [answers, setAnswers] = useState(() => attempt?.answers || emptyAnswers(total))
  const [flagged, setFlagged] = useState(() => new Set(attempt?.flagged || []))
  const [revealed, setRevealed] = useState(() => new Set(attempt?.revealed || []))
  const [idx, setIdx] = useState(() => Math.min(attempt?.idx || 0, total - 1))
  const [sectionSec, setSectionSec] = useState(() => attempt?.sectionSec || {})
  const [usedSec, setUsedSec] = useState(() => attempt?.usedSec || 0)
  const [paused, setPaused] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [flash, setFlash] = useState(null)
  const [zoomSrc, setZoomSrc] = useState(null)

  const feedbackRef = useRef(null)
  const submitted = useRef(false)
  const q = questions[idx]
  const sectionKey = q?.sectionKey || 'part'
  const sectionInfo = sections?.find((s) => s.key === sectionKey) || null
  const answeredCount = answers.filter((a) => a !== null).length
  const flaggedCount = flagged.size
  const chosen = answers[idx]
  const isRevealed = instantReveal && revealed.has(idx)
  const isCorrect = chosen !== null && chosen === q?.a

  const correctCount = useMemo(
    () => answers.reduce((sum, a, i) => (a !== null && a === questions[i].a ? sum + 1 : sum), 0),
    [answers, questions],
  )
  const wrongCount = useMemo(
    () => answers.reduce((sum, a, i) => (a !== null && a !== questions[i].a ? sum + 1 : sum), 0),
    [answers, questions],
  )

  /* ---------- autosave snapshot ---------- */
  const snapshot = useMemo(
    () => ({
      key: exam.key,
      kind: exam.kind,
      title: exam.title,
      label: exam.label,
      partId: exam.partId || null,
      setId: exam.setId || null,
      seed: exam.seed || null,
      sizeKey: exam.sizeKey || null,
      subsetCount: exam.subsetCount || null,
      batchIndex: exam.batchIndex ?? null,
      batchLabel: exam.batchLabel || null,
      subsetSeed: exam.subsetSeed || null,
      matchId: exam.matchId || null,
      total,
      answers,
      flagged: Array.from(flagged),
      revealed: Array.from(revealed),
      idx,
      usedSec,
      sectionSec,
      updatedAt: new Date().toISOString(),
    }),
    [answers, exam, flagged, idx, revealed, sectionSec, total, usedSec],
  )

  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const saveTimer = useRef(null)

  const flush = useCallback(() => {
    if (submitted.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    onSave?.(snapshotRef.current)
  }, [onSave])

  useEffect(() => {
    if (submitted.current || paused) return undefined
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave?.(snapshotRef.current), 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [snapshot, onSave, paused])

  useEffect(() => {
    const handler = () => flush()
    window.addEventListener('pagehide', handler)
    return () => {
      window.removeEventListener('pagehide', handler)
      handler()
    }
  }, [flush])

  /* ---------- count-up accumulated timer (unlimited time, never auto-submits) ---------- */
  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(() => {
      setUsedSec((u) => u + 1)
      setSectionSec((prev) => ({ ...prev, [sectionKey]: (prev[sectionKey] || 0) + 1 }))
    }, 1000)
    return () => clearInterval(id)
  }, [paused, sectionKey])

  /* ---------- live multiplayer progress sync ---------- */
  const usedSecRef = useRef(usedSec)
  usedSecRef.current = usedSec
  useEffect(() => {
    if (!exam.matchId || !onMatchProgress || submitted.current) return undefined
    onMatchProgress(exam.matchId, {
      answeredCount,
      totalQuestions: total,
      timeUsedSec: usedSecRef.current,
    })
    const id = setInterval(() => {
      if (!paused && !submitted.current) {
        onMatchProgress(exam.matchId, {
          answeredCount,
          totalQuestions: total,
          timeUsedSec: usedSecRef.current,
        })
      }
    }, 4000)
    return () => clearInterval(id)
  }, [answeredCount, exam.matchId, onMatchProgress, paused, total])

  /* ---------- flash effect auto-clear ---------- */
  useEffect(() => {
    if (!flash) return undefined
    const el = feedbackRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
    const id = setTimeout(() => setFlash(null), 1400)
    return () => clearTimeout(id)
  }, [flash])

  /* ---------- build result ---------- */
  const buildResult = useCallback(
    () => {
      const details = questions.map((item, i) => ({
        q: item.q,
        o: item.o,
        a: item.a,
        chosen: answers[i] ?? null,
        e: item.e,
        t: item.t,
        l: item.l || null,
        fig: item.fig || null,
        ofigs: item.ofigs || null,
        pictOpts: item.pictOpts || false,
        part: item.part || null,
        sectionKey: item.sectionKey || 'part',
        sectionLabel: item.sectionLabel || null,
      }))

      const correct = details.filter((d) => d.chosen === d.a).length
      const skipped = details.filter((d) => d.chosen === null).length
      const wrong = total - correct - skipped

      const topicMap = new Map()
      details.forEach((d) => {
        const row = topicMap.get(d.t) || { name: d.t, correct: 0, total: 0 }
        row.total += 1
        if (d.chosen === d.a) row.correct += 1
        topicMap.set(d.t, row)
      })

      const secStats = (sections || [
        { key: 'part', label: exam.partLabel || exam.label, points: total, count: total },
      ]).map((s) => {
        const rows = details.filter((d) => (d.sectionKey || 'part') === s.key)
        const right = rows.filter((d) => d.chosen === d.a).length
        return {
          key: s.key,
          label: s.label,
          color: s.color || exam.color || '#2563EB',
          correct: right,
          total: rows.length,
          points: s.count ? (right * s.points) / s.count : right,
          maxPoints: s.points,
          timeSec: sectionSec[s.key] || 0,
        }
      })

      const maxPoints = sections ? sections.reduce((sum, s) => sum + s.points, 0) : total
      const points = sections ? secStats.reduce((sum, s) => sum + s.points, 0) : correct
      const finalUsedSec = usedSec < 1 ? 1 : usedSec

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: exam.kind || 'part',
        partId: exam.partId || null,
        partLabel: exam.partLabel || exam.label,
        partTitle: exam.partTitle || exam.title,
        partColor: exam.color || '#2563EB',
        setId: exam.setId || null,
        setName: exam.setName || null,
        seed: exam.seed || null,
        sizeKey: exam.sizeKey || null,
        subsetCount: exam.subsetCount || null,
        batchIndex: exam.batchIndex ?? null,
        batchLabel: exam.batchLabel || null,
        subsetSeed: exam.subsetSeed || null,
        matchId: exam.matchId || null,
        date: new Date().toISOString(),
        name: name || '',
        score: Math.round((points / maxPoints) * 1000) / 10,
        points: Math.round(points * 10) / 10,
        maxPoints,
        correct,
        wrong,
        skipped,
        total,
        durationSec: null,
        timeUsedSec: finalUsedSec,
        timeUsedText: humanTime(finalUsedSec),
        autoSubmitted: false,
        sections: sections ? secStats : null,
        sectionTimes: sectionSec,
        topics: Array.from(topicMap.values()),
        items: details,
      }
    },
    [answers, exam, name, questions, sectionSec, sections, total, usedSec],
  )

  const submit = useCallback(() => {
    if (submitted.current) return
    submitted.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    onFinish(buildResult())
  }, [buildResult, onFinish])

  /* ---------- navigation & answering ---------- */
  const select = useCallback(
    (optionIdx) => {
      if (submitted.current) return
      if (instantReveal && revealed.has(idx)) return
      setAnswers((prev) => {
        const next = [...prev]
        next[idx] = optionIdx
        return next
      })
      if (instantReveal) {
        const ok = optionIdx === questions[idx].a
        setRevealed((prev) => new Set(prev).add(idx))
        setFlash({ idx, ok, at: Date.now() })
      }
    },
    [idx, instantReveal, questions, revealed],
  )

  const go = useCallback(
    (next) => {
      setIdx((cur) => {
        if (next < 0 || next >= total) return cur
        return next
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [total],
  )

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (sheet || zoomSrc) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (['1', '2', '3', '4'].includes(e.key)) select(Number(e.key) - 1)
      else if (e.key === 'ArrowRight') go(idx + 1)
      else if (e.key === 'ArrowLeft') go(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx, select, sheet, zoomSrc])

  const timerClass = 'timer-chip'
  const progress = ((idx + 1) / total) * 100
  const answeredPct = Math.round((answeredCount / total) * 100)

  const cellClass = (i) => {
    const base = ['palette-cell']
    if (answers[i] !== null) base.push('is-done')
    if (instantReveal && revealed.has(i)) base.push(answers[i] === questions[i].a ? 'is-ok' : 'is-no')
    if (i === idx) base.push('is-current')
    if (flagged.has(i)) base.push('is-flag')
    return base.join(' ')
  }

  const palette = (
    <div className="palette-grid">
      {questions.map((item, i) => (
        <button
          key={i}
          type="button"
          className={cellClass(i)}
          onClick={() => {
            setIdx(i)
            setSheet(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          aria-label={`ข้อ ${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {cloudSync?.status === 'error' && (
        <div role="alert" className="sync-banner-alert">
          ☁️ {cloudSync.error} · กลับหน้าแรกเพื่อจัดการการซิงก์
        </div>
      )}
      <header className="topbar topbar--sticky">
        <button
          className="icon-btn icon-btn--ghost"
          onClick={() => setSheet('exit')}
          aria-label="ออกจากการทดสอบ"
        >
          <Icon name="back" size={20} />
        </button>
        <div className="exam-top__title">
          <p>{exam.label}</p>
          <h2>{exam.title}</h2>
        </div>
        <div className={timerClass} role="timer" aria-live="off" title="เวลาที่ใช้สะสม (ไม่จำกัดเวลา)">
          <span className="timer-chip__dot" />
          <span className="num">{mmss(usedSec)}</span>
        </div>
        <button
          className="icon-btn icon-btn--ghost"
          onClick={() => setSheet('pause')}
          aria-label="หยุดพัก"
        >
          <Icon name="pause" size={18} />
        </button>
      </header>

      {match && Array.isArray(match.players) && match.players.length > 0 && (
        <div className="quiz-match-strip" aria-label="สถานะผู้ร่วมแข่งขันสด">
          <span className="quiz-match-strip__label">
            <Icon name="trophy" size={13} /> แข่งสด {match.players.length} คน:
          </span>
          <div className="quiz-match-strip__list">
            {match.players.map((p) => (
              <span
                key={p.userId}
                className={`quiz-match-pill ${p.userId === meId ? 'is-me' : ''} is-${p.status}`}
              >
                <b>{p.name}</b>
                <small className="num">
                  {p.status === 'finished'
                    ? `🏁 ${Math.round(p.score || 0)}%`
                    : p.status === 'playing'
                      ? `${p.answeredCount || 0}/${p.totalQuestions || total}`
                      : p.status === 'accepted'
                        ? 'พร้อม'
                        : p.status === 'declined'
                          ? 'ไม่แข่ง'
                          : 'รอตอบรับ'}
                </small>
              </span>
            ))}
          </div>
        </div>
      )}

      {sections && (
        <div className="sec-strip">
          {sections.map((s) => {
            const rows = questions.map((x, i) => ({ x, i })).filter((r) => r.x.sectionKey === s.key)
            const done = rows.filter((r) => answers[r.i] !== null).length
            const on = s.key === sectionKey
            return (
              <button
                key={s.key}
                type="button"
                className={`sec-chip ${on ? 'is-on' : ''}`}
                style={{ '--sec': s.color }}
                onClick={() => go(rows[0]?.i ?? 0)}
                aria-current={on ? 'true' : undefined}
              >
                <span className="sec-chip__name">{s.label}</span>
                <span className="sec-chip__meta">
                  {done}/{s.count} · {mmss(sectionSec[s.key] || 0)}
                </span>
                <span className="sec-chip__bar">
                  <i style={{ width: `${(done / s.count) * 100}%` }} />
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="quiz-body">
        <div className="quiz-main">
          <div className="progress-line">
            <div className="progress-line__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>
              ข้อ{' '}
              <b className="num" style={{ color: 'var(--ink)' }}>
                {idx + 1}
              </b>{' '}
              จาก {total}
            </span>
            <span>
              ตอบแล้ว{' '}
              <b className="num" style={{ color: 'var(--viol-600)' }}>
                {answeredCount}
              </b>{' '}
              ข้อ · {answeredPct}%
            </span>
          </div>

          <div className="q-wrap">
            <div
              className={`q-card ${flash && flash.idx === idx ? (flash.ok ? 'pulse-ok' : 'shake') : ''}`}
              key={`${sectionKey}-${idx}`}
            >
              {flash && flash.idx === idx && flash.ok && (
                <span className="burst" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <i key={i} style={{ '--a': `${i * 45}deg` }} />
                  ))}
                </span>
              )}
              <div className="q-tags">
                {sectionInfo ? (
                  <span className="tag tag--section" style={{ '--sec': sectionInfo.color }}>
                    {sectionInfo.label}
                  </span>
                ) : null}
                <span className="tag">{q.t}</span>
                {q.l && (
                  <span
                    className={`tag ${
                      q.l === 'ง่าย' ? 'tag--easy' : q.l === 'ยาก' ? 'tag--hard' : 'tag--ghost'
                    }`}
                  >
                    ระดับ {q.l}
                  </span>
                )}
                {q.part && <span className="tag tag--ghost">{q.part}</span>}
                <button
                  type="button"
                  onClick={toggleFlag}
                  aria-label={flagged.has(idx) ? 'เอาธงออก' : 'ปักธงข้อนี้'}
                  className={`flag-btn ${flagged.has(idx) ? 'is-on' : ''}`}
                >
                  <Icon name="flag" size={14} stroke={flagged.has(idx) ? 2.4 : 1.8} />
                  {flagged.has(idx) ? 'ปักธงแล้ว' : 'ปักธง'}
                </button>
              </div>

              <p className="q-num">ข้อที่ {idx + 1}</p>
              {q.q ? <p className="q-text">{q.q}</p> : null}
              {q.pictOpts && (
                <p className="sub q-pict-note" style={{ fontSize: 11.5, marginTop: -2 }}>
                  <Icon name="info" size={12} /> ภาพด้านบนคือโจทย์พร้อมตัวเลือก ก–ง — เลือกข้อที่ตรงกับคำตอบ
                </p>
              )}

              {q.fig && (
                <div
                  className="q-figure q-figure--zoomable"
                  onClick={(e) => {
                    const img = e.target.closest?.('img') || e.currentTarget.querySelector('img')
                    if (img?.src) setZoomSrc(img.getAttribute('src'))
                  }}
                  title="แตะเพื่อขยายภาพ"
                >
                  <div className="q-figure__content" dangerouslySetInnerHTML={{ __html: q.fig }} />
                  <span className="q-figure__zoom-hint" aria-hidden="true">
                    <Icon name="eye" size={12} /> แตะเพื่อขยายภาพ
                  </span>
                </div>
              )}

              <div className="options">
                {q.o.map((opt, i) => {
                  const state = !isRevealed
                    ? chosen === i
                      ? 'is-selected'
                      : ''
                    : i === q.a
                      ? 'is-correct'
                      : i === chosen
                        ? 'is-wrong'
                        : 'is-dim'
                  return (
                    <button
                      key={i}
                      className={`option ${state}`}
                      onClick={() => select(i)}
                      aria-pressed={chosen === i}
                      aria-disabled={isRevealed}
                    >
                      <span className="option__letter">{LETTERS[i]}</span>
                      <span className="option__text" style={{ flex: 1 }}>
                        {opt}
                        {q.ofigs && q.ofigs[i] && (
                          <span
                            style={{ display: 'block', marginTop: 8 }}
                            dangerouslySetInnerHTML={{ __html: q.ofigs[i] }}
                          />
                        )}
                      </span>
                      {isRevealed && i === q.a && (
                        <span className="option__mark option__mark--ok">
                          <Icon name="checkCircle" size={18} stroke={2} />
                        </span>
                      )}
                      {isRevealed && i === chosen && i !== q.a && (
                        <span className="option__mark option__mark--no">
                          <Icon name="close" size={18} stroke={2.2} />
                        </span>
                      )}
                      {!isRevealed && chosen === i && (
                        <span className="option__mark" style={{ color: 'var(--viol-600)' }}>
                          <Icon name="checkCircle" size={18} stroke={2} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {isRevealed ? (
                <div
                  ref={feedbackRef}
                  className={`feedback ${isCorrect ? 'is-ok' : 'is-bad'}`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="feedback__top">
                    <span className="feedback__icon">
                      <Icon name={isCorrect ? 'checkCircle' : 'close'} size={20} stroke={2.2} />
                    </span>
                    <div className="feedback__head">
                      <b>{isCorrect ? 'ตอบถูกต้อง!' : 'ยังไม่ถูกต้อง'}</b>
                      <span>
                        {isCorrect
                          ? 'เยี่ยมมาก — อ่านคำอธิบายแล้วไปข้อถัดไปได้เลย'
                          : `คำตอบที่ถูกคือข้อ ${LETTERS[q.a]}`}
                      </span>
                    </div>
                    <span className="feedback__badge">{isCorrect ? 'ถูก' : 'ผิด'}</span>
                  </div>

                  <div className="feedback__answer">
                    <span className="feedback__label">เฉลย</span>
                    <p>
                      <b>{LETTERS[q.a]}.</b> {q.o[q.a]}
                    </p>
                    {!isCorrect && chosen !== null && (
                      <p className="is-wrong-answer">
                        <b>{LETTERS[chosen]}.</b> {q.o[chosen]} <em>(คำตอบของคุณ)</em>
                      </p>
                    )}
                  </div>

                  <div className="feedback__exp">
                    <span className="feedback__label">คำอธิบายละเอียด</span>
                    <p>{q.e}</p>
                  </div>

                  <div className="feedback__meta">
                    <span>
                      <Icon name="target" size={12} /> {q.t}
                    </span>
                    {q.l && (
                      <span>
                        <Icon name="chart" size={12} /> ระดับ {q.l}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                instantReveal && (
                  <p className="reveal-hint">
                    <Icon name="eye" size={14} /> เลือกคำตอบแล้วระบบจะเฉลยพร้อมคำอธิบายทันที
                  </p>
                )
              )}
            </div>
          </div>

          <div className="quiz-foot">
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => go(idx - 1)}
              disabled={idx === 0}
              aria-label="ข้อก่อนหน้า"
            >
              <Icon name="back" size={18} />
            </button>
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => setSheet('palette')}
              aria-label="รายการข้อสอบ"
            >
              <Icon name="grid" size={18} />
              {flaggedCount > 0 && <i className="btn__dot" />}
            </button>
            {idx === total - 1 ? (
              <button className="btn btn--primary" onClick={() => setSheet('submit')}>
                <Icon name="check" size={17} stroke={2.4} /> ส่งคำตอบ
              </button>
            ) : (
              <button className="btn btn--primary" onClick={() => go(idx + 1)}>
                ข้อถัดไป <Icon name="chevron" size={17} />
              </button>
            )}
          </div>
        </div>

        <aside className="quiz-aside" aria-label="ภาพรวมการทำข้อสอบ">
          <div className="aside-card">
            <div className="aside-head">
              <b>ภาพรวม</b>
              <span className="num">
                {answeredCount}/{total}
              </span>
            </div>
            <div className="aside-stats">
              <span className="is-ok">
                <b>{correctCount}</b> ถูก
              </span>
              <span className="is-no">
                <b>{wrongCount}</b> ผิด
              </span>
              <span>
                <b>{total - answeredCount}</b> ค้าง
              </span>
            </div>
            <div className="aside-progress">
              <i style={{ width: `${(correctCount / total) * 100}%`, background: 'var(--mint)' }} />
              <i style={{ width: `${(wrongCount / total) * 100}%`, background: 'var(--coral)' }} />
            </div>
            <div className="aside-palette">{palette}</div>
          </div>

          <div className="aside-card">
            <div className="aside-head">
              <b>เวลา / รายวิชา</b>
              <span className="num">{humanTime(usedSec)}</span>
            </div>
            {(sections || [{ key: 'part', label: exam.label, count: total, color: 'var(--viol-600)' }]).map(
              (s) => {
                const rows = questions.filter((x) => (x.sectionKey || 'part') === s.key)
                const done = rows.filter((x) => answers[questions.indexOf(x)] !== null).length
                return (
                  <div className="aside-sec" key={s.key}>
                    <span className="aside-sec__dot" style={{ background: s.color }} />
                    <span className="aside-sec__label">{s.label}</span>
                    <span className="aside-sec__time num">{mmss(sectionSec[s.key] || 0)}</span>
                    <span className="aside-sec__count">
                      {done}/{s.count}
                    </span>
                  </div>
                )
              },
            )}
          </div>

          <button className="btn btn--ghost btn--block" onClick={() => setSheet('pause')}>
            <Icon name="pause" size={16} /> หยุดพัก / บันทึกความคืบหน้า
          </button>
        </aside>
      </div>

      {zoomSrc && <FigureModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}

      {sheet === 'exit' && (
        <Sheet
          title="หยุดทำชั่วคราว?"
          desc="ระบบจะบันทึกคำตอบ เวลารายพาร์ท และข้อที่ทำค้างไว้ให้อัตโนมัติ กลับมาทำต่อได้ทุกเมื่อ"
          onClose={() => setSheet(null)}
          actions={
            <>
              <button className="btn btn--ghost" onClick={() => setSheet(null)}>
                ทำต่อ
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  flush()
                  onExit()
                }}
              >
                บันทึกและออก
              </button>
            </>
          }
        />
      )}

      {sheet === 'pause' && (
        <Sheet
          title="หยุดพักการทำข้อสอบ"
          desc="ไม่จำกัดเวลาทำข้อสอบ — คำตอบและเวลาสะสมจะถูกเก็บไว้ และเวลาจะหยุดนับระหว่างพัก"
          onClose={() => setSheet(null)}
        >
          <div className="pause-card">
            <div>
              <span>ทำแล้ว</span>
              <b>
                {answeredCount}/{total} ข้อ
              </b>
            </div>
            <div>
              <span>ยังไม่ได้ตอบ</span>
              <b>{total - answeredCount} ข้อ</b>
            </div>
            <div>
              <span>เวลาสะสมที่ใช้</span>
              <b>{humanTime(usedSec)}</b>
            </div>
          </div>
          <div className="sheet__actions">
            <button className="btn btn--ghost" onClick={() => setSheet(null)}>
              ทำต่อ
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                if (saveTimer.current) clearTimeout(saveTimer.current)
                onSave?.(snapshotRef.current)
                setPaused(true)
                setSheet(null)
              }}
            >
              <Icon name="pause" size={16} /> พักไว้ก่อน
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'submit' && (
        <Sheet
          title="ยืนยันการส่งคำตอบ"
          desc={`ตอบแล้ว ${answeredCount} จาก ${total} ข้อ${
            total - answeredCount > 0 ? ` (ยังไม่ได้ตอบ ${total - answeredCount} ข้อ)` : ' (ครบทุกข้อแล้ว)'
          } · เวลาสะสม ${humanTime(usedSec)}${
            flaggedCount ? ` · ปักธงไว้ ${flaggedCount} ข้อ` : ''
          }`}
          onClose={() => setSheet(null)}
          actions={
            <>
              <button className="btn btn--ghost" onClick={() => setSheet(null)}>
                ตรวจทานอีกครั้ง
              </button>
              <button className="btn btn--primary" onClick={() => submit()}>
                ส่งคำตอบ
              </button>
            </>
          }
        />
      )}

      {sheet === 'palette' && (
        <Sheet
          title="รายการข้อสอบ"
          desc="แตะหมายเลขเพื่อไปยังข้อนั้น · ปักธงเพื่อกลับมาตรวจทาน"
          onClose={() => setSheet(null)}
        >
          <label className="toggle-row">
            <span className="toggle-row__text">
              <b>เฉลยทันทีเมื่อเลือกคำตอบ</b>
              <i>ปิดเพื่อทำแบบไม่เห็นเฉลยจนกว่าจะส่งคำตอบ</i>
            </span>
            <button
              type="button"
              className={`switch ${instantReveal ? 'is-on' : ''}`}
              onClick={() => onToggleInstantReveal?.()}
              aria-pressed={instantReveal}
              aria-label="สลับการเฉลยทันที"
            >
              <span className="switch__knob">
                <Icon name={instantReveal ? 'eye' : 'lock'} size={13} />
              </span>
            </button>
          </label>

          {sections ? (
            sections.map((s) => {
              const rows = questions.map((x, i) => ({ x, i })).filter((row) => row.x.sectionKey === s.key)
              return (
                <div key={s.key} className="palette-group">
                  <p className="palette-group__title" style={{ color: s.color }}>
                    {s.label} · {s.count} ข้อ
                  </p>
                  <div className="palette-grid">
                    {rows.map(({ i }) => (
                      <button
                        key={i}
                        type="button"
                        className={cellClass(i)}
                        onClick={() => {
                          setIdx(i)
                          setSheet(null)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            palette
          )}

          <div className="palette-legend">
            <span>
              <i style={{ background: 'var(--viol-500)' }} /> ข้อปัจจุบัน
            </span>
            <span>
              <i style={{ background: 'var(--mint)' }} /> ตอบถูก
            </span>
            <span>
              <i style={{ background: 'var(--coral)' }} /> ตอบผิด
            </span>
            <span>
              <i style={{ background: 'var(--amber)', border: 0 }} /> ปักธง
            </span>
          </div>

          <div className="sheet__actions">
            <button className="btn btn--soft" onClick={() => setSheet('pause')}>
              <Icon name="pause" size={16} /> หยุดพัก
            </button>
            <button className="btn btn--primary" onClick={() => setSheet('submit')}>
              ส่งคำตอบ
            </button>
          </div>
        </Sheet>
      )}

      {paused && (
        <div className="paused-veil">
          <div className="paused-card">
            <div className="paused-card__icon">
              <Icon name="pause" size={26} />
            </div>
            <h3>พักการทำข้อสอบแล้ว</h3>
            <p>
              ความคืบหน้าถูกบันทึกไว้ที่ {answeredCount}/{total} ข้อ ใช้เวลาไป {humanTime(usedSec)}
              <br />
              เวลาจะหยุดนับจนกว่าจะกลับมาทำต่อ
            </p>
            <div className="paused-card__actions">
              <button className="btn btn--primary btn--block" onClick={() => setPaused(false)}>
                <Icon name="play" size={17} /> ทำต่อทันที
              </button>
              <button className="btn btn--ghost btn--block" onClick={() => onExit('paused')}>
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
