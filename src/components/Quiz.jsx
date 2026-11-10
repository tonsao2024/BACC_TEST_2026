import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { humanTime, mmss } from '../lib/storage.js'
import Icon from './Icons.jsx'
import { Sheet } from './ui.jsx'

const LETTERS = ['ก', 'ข', 'ค', 'ง']

const emptyAnswers = (n) => Array(n).fill(null)

export default function Quiz({ exam, name, attempt, onSave, onExit, onFinish }) {
  const questions = exam.questions
  const total = questions.length
  const duration = exam.minutes * 60
  const sections = exam.sections || null

  const [answers, setAnswers] = useState(() => attempt?.answers || emptyAnswers(total))
  const [flagged, setFlagged] = useState(() => new Set(attempt?.flagged || []))
  const [idx, setIdx] = useState(() => Math.min(attempt?.idx || 0, total - 1))
  const [remaining, setRemaining] = useState(() =>
    typeof attempt?.remaining === 'number' ? attempt.remaining : duration,
  )
  const [sectionSec, setSectionSec] = useState(() => attempt?.sectionSec || {})
  const [usedSec, setUsedSec] = useState(() => attempt?.usedSec || 0)
  const [paused, setPaused] = useState(false)
  const [sheet, setSheet] = useState(null)

  const submitted = useRef(false)
  const q = questions[idx]
  const sectionKey = q?.sectionKey || 'part'
  const sectionInfo = sections?.find((s) => s.key === sectionKey) || null
  const answeredCount = answers.filter((a) => a !== null).length
  const flaggedCount = flagged.size

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
      total,
      answers,
      flagged: Array.from(flagged),
      idx,
      remaining,
      usedSec,
      sectionSec,
      updatedAt: new Date().toISOString(),
    }),
    [answers, exam, flagged, idx, remaining, sectionSec, total, usedSec],
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
    if (submitted.current || paused) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave?.(snapshotRef.current), 600)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [snapshot, onSave, paused])

  /* ---------- flush on unload ---------- */
  useEffect(() => {
    const handler = () => flush()
    window.addEventListener('pagehide', handler)
    return () => {
      window.removeEventListener('pagehide', handler)
      handler()
    }
  }, [flush])

  /* ---------- timer ---------- */
  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(() => {
      setUsedSec((u) => u + 1)
      setSectionSec((prev) => ({ ...prev, [sectionKey]: (prev[sectionKey] || 0) + 1 }))
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [paused, sectionKey])

  /* ---------- build result ---------- */
  const buildResult = useCallback(
    (auto = false) => {
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
          color: s.color || exam.color || '#6C4CF1',
          correct: right,
          total: rows.length,
          points: s.count ? (right * s.points) / s.count : right,
          maxPoints: s.points,
          timeSec: sectionSec[s.key] || 0,
        }
      })

      const maxPoints = sections ? sections.reduce((sum, s) => sum + s.points, 0) : total
      const points = sections
        ? secStats.reduce((sum, s) => sum + s.points, 0)
        : correct

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: exam.kind || 'part',
        partId: exam.partId || null,
        partLabel: exam.partLabel || exam.label,
        partTitle: exam.partTitle || exam.title,
        partColor: exam.color || '#6C4CF1',
        setId: exam.setId || null,
        setName: exam.setName || null,
        seed: exam.seed || null,
        sizeKey: exam.sizeKey || null,
        date: new Date().toISOString(),
        name: name || '',
        score: Math.round((points / maxPoints) * 1000) / 10,
        points: Math.round(points * 10) / 10,
        maxPoints,
        correct,
        wrong,
        skipped,
        total,
        durationSec: duration,
        timeUsedSec: usedSec < 1 ? 1 : usedSec,
        autoSubmitted: auto,
        sections: sections ? secStats : null,
        sectionTimes: sectionSec,
        topics: Array.from(topicMap.values()),
        items: details,
      }
    },
    [answers, duration, exam, name, questions, sectionSec, sections, total, usedSec],
  )

  const submitRef = useRef(buildResult)
  submitRef.current = buildResult

  const submit = useCallback(
    (auto = false) => {
      if (submitted.current) return
      submitted.current = true
      if (saveTimer.current) clearTimeout(saveTimer.current)
      onFinish(buildResult(auto))
    },
    [buildResult, onFinish],
  )

  useEffect(() => {
    if (remaining <= 0 && !submitted.current) submit(true)
  }, [remaining, submit])

  /* ---------- navigation ---------- */
  const select = useCallback(
    (optionIdx) => {
      setAnswers((prev) => {
        const next = [...prev]
        next[idx] = next[idx] === optionIdx ? null : optionIdx
        return next
      })
    },
    [idx],
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
      if (sheet) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (['1', '2', '3', '4'].includes(e.key)) select(Number(e.key) - 1)
      else if (e.key === 'ArrowRight') go(idx + 1)
      else if (e.key === 'ArrowLeft') go(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx, select, sheet])

  const timerClass =
    remaining <= 60 ? 'timer-chip is-danger' : remaining <= 300 ? 'timer-chip is-warn' : 'timer-chip'
  const progress = ((idx + 1) / total) * 100
  const answeredPct = Math.round((answeredCount / total) * 100)

  const sectionHeader = (key) => sections?.find((s) => s.key === key)?.label || null

  return (
    <>
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
        <div className={timerClass} role="timer" aria-live="off">
          <span className="timer-chip__dot" />
          <span className="num">{mmss(remaining)}</span>
        </div>
        <button
          className="icon-btn icon-btn--ghost"
          onClick={() => setSheet('pause')}
          aria-label="หยุดพัก"
        >
          <Icon name="pause" size={18} />
        </button>
      </header>

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

      <div style={{ padding: '4px 0 0' }}>
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
          <div className="q-card" key={`${sectionKey}-${idx}`}>
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
            <p className="q-text">{q.q}</p>

            {q.fig && <div className="q-figure" dangerouslySetInnerHTML={{ __html: q.fig }} />}

            <div className="options">
              {q.o.map((opt, i) => (
                <button
                  key={i}
                  className={`option ${answers[idx] === i ? 'is-selected' : ''}`}
                  onClick={() => select(i)}
                  aria-pressed={answers[idx] === i}
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
                  {answers[idx] === i && (
                    <span className="option__mark" style={{ color: 'var(--viol-600)' }}>
                      <Icon name="checkCircle" size={18} stroke={2} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
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
          desc="ไม่ต้องทำจบในครั้งเดียว — คำตอบและเวลาที่ใช้จะถูกเก็บไว้ และเวลาจะหยุดนับระหว่างพัก"
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
              <span>เวลาที่ใช้ไป</span>
              <b>{humanTime(usedSec)}</b>
            </div>
            <div>
              <span>เวลาที่เหลือ</span>
              <b>{mmss(remaining)}</b>
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
          desc={`ตอบแล้ว ${answeredCount} จาก ${total} ข้อ · เหลือเวลา ${mmss(remaining)}${
            flaggedCount ? ` · ปักธงไว้ ${flaggedCount} ข้อ` : ''
          }`}
          onClose={() => setSheet(null)}
          actions={
            <>
              <button className="btn btn--ghost" onClick={() => setSheet(null)}>
                ตรวจทานอีกครั้ง
              </button>
              <button className="btn btn--primary" onClick={() => submit(false)}>
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
          {sections ? (
            sections.map((s) => {
              const rows = questions
                .map((x, i) => ({ x, i }))
                .filter((row) => row.x.sectionKey === s.key)
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
                        className={`palette-cell ${answers[i] !== null ? 'is-done' : ''} ${
                          i === idx ? 'is-current' : ''
                        } ${flagged.has(i) ? 'is-flag' : ''}`}
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
            <div className="palette-grid">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`palette-cell ${answers[i] !== null ? 'is-done' : ''} ${
                    i === idx ? 'is-current' : ''
                  } ${flagged.has(i) ? 'is-flag' : ''}`}
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
          )}

          <div className="palette-legend">
            <span>
              <i style={{ background: 'var(--viol-500)' }} /> ข้อปัจจุบัน
            </span>
            <span>
              <i style={{ background: 'var(--viol-100)' }} /> ตอบแล้ว
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
