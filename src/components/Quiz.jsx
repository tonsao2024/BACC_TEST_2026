import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mmss } from '../lib/storage.js'
import Icon from './Icons.jsx'
import { Sheet } from './ui.jsx'

const LETTERS = ['ก', 'ข', 'ค', 'ง']

export default function Quiz({ part, name, onExit, onFinish }) {
  const total = part.questions.length
  const duration = part.minutes * 60
  const [answers, setAnswers] = useState(() => Array(total).fill(null))
  const [flagged, setFlagged] = useState(() => new Set())
  const [idx, setIdx] = useState(0)
  const [remaining, setRemaining] = useState(duration)
  const [sheet, setSheet] = useState(null)
  const submitted = useRef(false)

  const q = part.questions[idx]
  const answeredCount = answers.filter((a) => a !== null).length

  const submit = useCallback(
    (auto = false) => {
      if (submitted.current) return
      submitted.current = true

      const details = part.questions.map((item, i) => ({
        q: item.q,
        o: item.o,
        a: item.a,
        chosen: answers[i],
        e: item.e,
        t: item.t,
        fig: item.fig || null,
        ofigs: item.ofigs || null,
        part: item.part || null,
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

      const timeUsedSec = duration - remaining
      onFinish({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        partId: part.id,
        partLabel: part.label,
        partTitle: part.title,
        partColor: part.color,
        date: new Date().toISOString(),
        name: name || '',
        score: Math.round((correct / total) * 1000) / 10,
        correct,
        wrong,
        skipped,
        total,
        durationSec: duration,
        timeUsedSec: timeUsedSec < 1 ? 1 : timeUsedSec,
        autoSubmitted: auto,
        topics: Array.from(topicMap.values()),
        items: details,
      })
    },
    [answers, duration, name, onFinish, part, remaining, total],
  )

  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  }, [submit])

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (remaining === 0) submitRef.current(true)
  }, [remaining])

  /* keyboard shortcuts (desktop) */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (['1', '2', '3', '4'].includes(e.key)) select(Number(e.key) - 1)
      else if (e.key === 'ArrowRight') go(idx + 1)
      else if (e.key === 'ArrowLeft') go(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const select = (optionIdx) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[idx] = optionIdx
      return next
    })
  }

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const go = (next) => {
    if (next < 0 || next >= total) return
    setIdx(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const timerClass =
    remaining <= 60 ? 'timer-chip is-danger' : remaining <= 300 ? 'timer-chip is-warn' : 'timer-chip'

  const progress = ((idx + 1) / total) * 100

  const topicCount = useMemo(() => new Set(part.questions.map((x) => x.t)).size, [part])

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
          <p>พาร์ท {part.label} · {topicCount} หัวข้อ</p>
          <h2>{part.title}</h2>
        </div>
        <div className={timerClass} role="timer" aria-live="off">
          <span className="timer-chip__dot" />
          <span className="num">{mmss(remaining)}</span>
        </div>
      </header>

      <div style={{ padding: '4px 0 0' }}>
        <div className="progress-line">
          <div className="progress-line__fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>
            ข้อ <b className="num" style={{ color: 'var(--ink)' }}>{idx + 1}</b> จาก {total}
          </span>
          <span>
            ตอบแล้ว <b className="num" style={{ color: 'var(--viol-600)' }}>{answeredCount}</b> ข้อ
          </span>
        </div>

        <div className="q-wrap">
          <div className="q-card" key={idx}>
            <div className="q-tags">
              <span className="tag">{q.t}</span>
              {q.l && (
                <span className={`tag ${q.l === 'ง่าย' ? 'tag--easy' : q.l === 'ยาก' ? 'tag--hard' : 'tag--ghost'}`}>
                  ระดับ {q.l}
                </span>
              )}
              {q.part && <span className="tag tag--ghost">{q.part}</span>}
              <button
                onClick={toggleFlag}
                aria-label="ปักธงข้อนี้"
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  color: flagged.has(idx) ? 'var(--amber)' : 'var(--muted)',
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: flagged.has(idx) ? 'var(--amber-soft)' : 'transparent',
                  transition: 'all .25s',
                }}
              >
                <Icon name="flag" size={14} stroke={flagged.has(idx) ? 2.4 : 1.8} />
                {flagged.has(idx) ? 'ปักธง' : 'ปักธง'}
              </button>
            </div>

            <p className="q-num">ข้อที่ {idx + 1}</p>
            <p className="q-text">{q.q}</p>

            {q.fig && (
              <div className="q-figure" dangerouslySetInnerHTML={{ __html: q.fig }} />
            )}

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
        <button className="btn btn--ghost btn--icon" onClick={() => setSheet('palette')} aria-label="รายการข้อสอบ">
          <Icon name="grid" size={18} />
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
          title="ออกจากการทดสอบ?"
          desc="คำตอบที่เลือกไว้จะไม่ถูกบันทึก และเวลาที่ใช้จะไม่ถูกนับเป็นผลการทดสอบ"
          onClose={() => setSheet(null)}
          actions={
            <>
              <button className="btn btn--ghost" onClick={() => setSheet(null)}>
                ทำต่อ
              </button>
              <button className="btn btn--primary" onClick={() => onExit()}>
                ออก
              </button>
            </>
          }
        />
      )}

      {sheet === 'submit' && (
        <Sheet
          title="ยืนยันการส่งคำตอบ"
          desc={`คุณตอบแล้ว ${answeredCount} จาก ${total} ข้อ · เหลือเวลา ${mmss(remaining)}`}
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
        <Sheet title="รายการข้อสอบ" desc="แตะหมายเลขเพื่อไปยังข้อนั้น" onClose={() => setSheet(null)}>
          <div className="palette-grid">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                className={`palette-cell ${answers[i] !== null ? 'is-done' : ''} ${i === idx ? 'is-current' : ''}`}
                onClick={() => {
                  setIdx(i)
                  setSheet(null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                {i + 1}
                {flagged.has(i) && (
                  <span
                    style={{
                      position: 'absolute',
                      marginTop: -18,
                      marginLeft: 16,
                      width: 5,
                      height: 5,
                      borderRadius: 99,
                      background: 'var(--amber)',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="palette-legend">
            <span>
              <i style={{ background: 'var(--viol-500)' }} /> ข้อปัจจุบัน
            </span>
            <span>
              <i style={{ background: 'var(--viol-100)' }} /> ตอบแล้ว
            </span>
            <span>
              <i style={{ background: '#fff', border: '1px solid var(--line)' }} /> ยังไม่ตอบ
            </span>
          </div>
          <div className="sheet__actions">
            <button className="btn btn--soft btn--block" onClick={() => setSheet('submit')}>
              ส่งคำตอบตอนนี้
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
