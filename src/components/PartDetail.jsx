import { useState } from 'react'
import { driveDownload, driveView } from '../data/index.js'
import { bestFor, formatThaiDateTime, humanTime } from '../lib/storage.js'
import { certTier } from '../lib/certs.js'
import Icon from './Icons.jsx'
import { MiniRing } from './ui.jsx'

const RULES = [
  'แต่ละข้อมี 4 ตัวเลือก เลือกได้เพียงคำตอบเดียว ไม่มีคะแนนติดลบ',
  'ไม่จำกัดเวลาทำข้อสอบ ระบบจะนับเวลาสะสมไปเรื่อยๆ จนกว่าจะทำครบและกดส่งคำตอบ',
  'สามารถหยุดพักหรือย้อนกลับไปแก้ไขข้อก่อนหน้าได้ก่อนกดส่งคำตอบ',
  'หลังส่งคำตอบจะเห็นเฉลยและคำอธิบายทุกข้อ พร้อมดาวน์โหลดรายงานผล',
]

export default function PartDetail({
  part,
  results = [],
  attempt = null,
  attempts = [],
  onBack,
  onStart,
  onRestart,
  onReadDoc,
  onOpenSources,
  partFileName,
}) {
  const isSpecial = part.group === 'special' && Array.isArray(part.sections) && part.sections.length > 0
  const [pickedSections, setPickedSections] = useState(() =>
    isSpecial ? part.sections.map((s) => s.key) : [],
  )
  const activeSections = isSpecial
    ? part.sections.filter((s) => pickedSections.includes(s.key))
    : []
  const scopedQuestions = isSpecial
    ? pickedSections.length < part.sections.length
      ? part.questions.filter((q) => pickedSections.includes(q.sectionKey))
      : part.questions
    : part.questions

  const totalCount = scopedQuestions.length
  const [selectedCount, setSelectedCount] = useState('all')
  const [batchIndex, setBatchIndex] = useState(0)

  const countOptions = [
    { count: 10, label: '10 ข้อ', desc: 'มินิทดสอบด่วน' },
    { count: 20, label: '20 ข้อ', desc: 'ฝึกซ้อมกำลังดี' },
    { count: 50, label: '50 ข้อ', desc: 'ครึ่งชุด' },
    { count: 'all', label: `ทั้งหมด (${totalCount} ข้อ)`, desc: 'เต็มพาร์ทรอบเดียว' },
  ].filter((opt) => opt.count === 'all' || opt.count < totalCount)

  const numBatches = selectedCount !== 'all' ? Math.ceil(totalCount / selectedCount) : 1
  const batches = []
  if (selectedCount !== 'all') {
    for (let i = 0; i < numBatches; i += 1) {
      const start = i * selectedCount + 1
      const end = Math.min(totalCount, (i + 1) * selectedCount)
      batches.push({
        index: i,
        label: `ชุดที่ ${i + 1}`,
        range: `ข้อ ${start}–${end}`,
        count: end - start + 1,
        start,
        end,
      })
    }
  }

  const sectionSuffix = isSpecial
    ? activeSections.length === part.sections.length
      ? ''
      : `:sec:${part.sections.filter((s) => pickedSections.includes(s.key)).map((s) => s.key).join('+')}`
    : ''
  const baseKey = `part:${part.id}${sectionSuffix}`

  const currentKey =
    selectedCount === 'all'
      ? baseKey
      : batchIndex === 'random'
        ? `${baseKey}:random:${selectedCount}`
        : `${baseKey}:b${selectedCount}:${batchIndex}`

  const activeAttempt =
    (attempts || []).find((a) => {
      if (selectedCount === 'all') return a.key === baseKey
      if (batchIndex === 'random') return a.key && a.key.startsWith(`${baseKey}:random:${selectedCount}`)
      return a.key === `${baseKey}:b${selectedCount}:${batchIndex}`
    }) ||
    (attempt && (attempt.key === currentKey || (selectedCount === 'all' && attempt.key === baseKey))
      ? attempt
      : null)

  const currentCount =
    selectedCount === 'all'
      ? totalCount
      : batchIndex === 'random'
        ? selectedCount
        : batches[batchIndex]?.count || selectedCount

  const answered = activeAttempt ? (activeAttempt.answers || []).filter((a) => a !== null).length : 0

  const batchLabel =
    selectedCount === 'all'
      ? `ทั้งหมด (${totalCount} ข้อ)`
      : batchIndex === 'random'
        ? `สุ่ม ${selectedCount} ข้อ`
        : `${batches[batchIndex]?.label || 'ชุดย่อย'} (ข้อ ${batches[batchIndex]?.start || 1}–${batches[batchIndex]?.end || selectedCount})`

  const sectionParam = isSpecial
    ? activeSections.length === part.sections.length
      ? []
      : activeSections.map((s) => s.key)
    : []

  const currentOpts = {
    count: selectedCount,
    batchIndex,
    isRandom: batchIndex === 'random',
    seed: activeAttempt?.subsetSeed || null,
    examKey: activeAttempt?.key || null,
    sectionKeys: sectionParam,
  }

  const best = bestFor(part.id, results)
  const rows = results.filter((r) => r.partId === part.id)

  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onBack} aria-label="ย้อนกลับ">
          <Icon name="back" size={20} />
        </button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>
            รายละเอียดพาร์ท
          </h1>
          <p className="brand__sub">พาร์ท {part.label} · {part.questions.length} ข้อ</p>
        </div>
        <button className="icon-btn" onClick={onOpenSources} aria-label="เอกสารต้นฉบับ">
          <Icon name="docs" size={18} />
        </button>
      </header>

      <div style={{ padding: '8px 0 0' }}>
        <div
          className="part-hero"
          style={{ background: `linear-gradient(145deg, ${part.color}, ${part.color2})` }}
        >
          <span className="part-hero__badge">
            <Icon name={part.icon} size={13} /> พาร์ท {part.label}
          </span>
          <h1>{part.title}</h1>
          <p>{part.desc}</p>
          <div className="part-hero__grid">
            <div className="part-hero__cell">
              <b className="num">{currentCount}</b>
              <span>{selectedCount === 'all' ? 'ข้อสอบเต็มพาร์ท' : 'ข้อที่เลือกทำ'}</span>
            </div>
            <div className="part-hero__cell">
              <b className="num">∞</b>
              <span>ไม่จำกัดเวลา</span>
            </div>
            <div className="part-hero__cell">
              <b className="num">{currentCount}</b>
              <span>คะแนนเต็ม</span>
            </div>
          </div>
        </div>

        {best && (
          <div className="info-card best-card">
            <MiniRing value={best.score} size={56} />
            <div className="best-card__body">
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>ผลดีที่สุดของคุณ</p>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 3 }}>
                {best.correct}/{best.total} ข้อ · {formatThaiDateTime(best.date)}
              </p>
              <p
                className="sub"
                style={{
                  fontSize: 11,
                  marginTop: 5,
                  color: best.score >= 60 ? '#067a55' : '#b45309',
                  fontWeight: 600,
                }}
              >
                {best.score >= 60
                  ? `${certTier(best.score).medal} ผ่านเกณฑ์แล้ว · เกียรติบัตรอยู่ในหน้าประวัติผลสอบ`
                  : `เหลืออีก ${60 - Math.round(best.score)} คะแนน ถึงเกณฑ์ผ่าน 60%`}
              </p>
            </div>
            <span
              className={`result-badge best-card__badge ${best.score >= 60 ? 'result-badge--pass' : 'result-badge--fail'}`}
            >
              {Math.round(best.score)} คะแนน
            </span>
          </div>
        )}

        {isSpecial && (
          <section className="section part-batch-section">
            <div className="section__head">
              <div>
                <h3 className="section__title">
                  <Icon name="list" size={15} /> เลือกวิชาย่อย (Section)
                </h3>
                <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                  ทำได้ทีละวิชา หรือเลือกหลายวิชาพร้อมกัน · เลือกแล้ว {totalCount} ข้อ
                </p>
              </div>
              <button
                type="button"
                className="section__link"
                onClick={() => setPickedSections(part.sections.map((s) => s.key))}
              >
                ทั้งหมด
              </button>
            </div>
            <div className="special-sections">
              {part.sections.map((s) => {
                const on = pickedSections.includes(s.key)
                const secAttempts = (attempts || []).filter((a) => a.key && a.key.startsWith(`part:${part.id}`))
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`special-section ${on ? 'is-on' : ''}`}
                    style={{ '--sec': s.color, '--sec-soft': `${s.color}38` }}
                    aria-pressed={on}
                    onClick={() =>
                      setPickedSections((prev) => {
                        if (!prev.includes(s.key)) return [...prev, s.key]
                        if (prev.length === 1) return prev
                        return prev.filter((k) => k !== s.key)
                      })
                    }
                  >
                    <span className="special-section__dot" />
                    <span className="special-section__body">
                      <b>{s.label}</b>
                      <small>
                        ข้อ {s.from}–{s.to} · {s.count} ข้อ
                      </small>
                    </span>
                    <span className={`special-section__check ${on ? 'is-on' : ''}`}>
                      {on ? <Icon name="check" size={12} stroke={2.6} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="section part-batch-section">
          <div className="section__head">
            <div>
              <h3 className="section__title">
                <Icon name="layers" size={15} /> เลือกจำนวนข้อสอบที่จะทำ
              </h3>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                ทยอยทำทีละ 10, 20, 50 ข้อเพื่อไม่ให้ท้อ หรือเลือกทำครบทั้งหมด {totalCount} ข้อรอบเดียวได้
              </p>
            </div>
            {selectedCount !== 'all' && (
              <span className="section__link" style={{ color: 'var(--viol-600)', fontWeight: 600 }}>
                {batchLabel}
              </span>
            )}
          </div>

          <div className="batch-size-grid">
            {countOptions.map((opt) => {
              const isActive = selectedCount === opt.count
              return (
                <button
                  type="button"
                  key={String(opt.count)}
                  className={`batch-size-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedCount(opt.count)
                    if (opt.count !== 'all') setBatchIndex(0)
                  }}
                >
                  <span className="batch-size-card__count num">
                    {opt.count === 'all' ? totalCount : opt.count}
                  </span>
                  <b className="batch-size-card__label">{opt.label}</b>
                  <small className="batch-size-card__desc">{opt.desc}</small>
                </button>
              )
            })}
          </div>

          {selectedCount !== 'all' && (
            <div className="batch-picker">
              <div className="batch-picker__head">
                <span className="batch-picker__title">
                  <Icon name="checkCircle" size={13} /> เลือกชุดข้อสอบย่อย ({batches.length} ชุด):
                </span>
                <span className="batch-picker__hint">
                  {batchIndex === 'random'
                    ? `สุ่ม ${selectedCount} ข้อไม่ซ้ำกัน`
                    : `${batches[batchIndex]?.label} · ${batches[batchIndex]?.range}`}
                </span>
              </div>

              <div className="batch-chips-scroll">
                <button
                  type="button"
                  className={`batch-chip batch-chip--random ${batchIndex === 'random' ? 'is-active' : ''}`}
                  onClick={() => setBatchIndex('random')}
                >
                  <Icon name="wand" size={12} /> สุ่ม {selectedCount} ข้อ
                </button>
                {batches.map((b) => (
                  <button
                    type="button"
                    key={b.index}
                    className={`batch-chip ${batchIndex === b.index ? 'is-active' : ''}`}
                    onClick={() => setBatchIndex(b.index)}
                  >
                    <b>{b.label}</b>
                    <small>{b.range}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="detail-grid">
          <section className="section" style={{ marginTop: 18 }}>
            <div className="section__head">
              <h3 className="section__title">คำชี้แจงก่อนเริ่มทำข้อสอบ</h3>
            </div>
            <div className="info-card">
              <div className="info-list">
                {RULES.map((r, i) => (
                  <div className="info-item" key={i}>
                    <span className="info-item__ico">
                      <Icon name="check" size={13} stroke={2.2} />
                    </span>
                    <span>{r}</span>
                  </div>
                ))}
                <div className="info-item">
                  <span className="info-item__ico">
                    <Icon name="clock" size={13} />
                  </span>
                  <span>
                    รูปแบบเวลา: <b>นับเวลาสะสมต่อเนื่อง ไม่จำกัดเวลา</b> · คะแนนผ่านเกณฑ์ 60 คะแนน
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__head">
              <h3 className="section__title">เอกสารต้นฉบับ</h3>
            </div>
            <div className="download-card">
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500 }}>ไฟล์ข้อสอบฉบับเต็ม</p>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 4 }}>
                {partFileName || `${part.label}_ข้อสอบ_${part.officialCount}ข้อ.pdf`}
                {part.id === '2' ? ' · พาร์ท 2 อยู่ในวิชาที่ 2 ของคลังข้อสอบ 300 ข้อ' : part.id === 'mock' ? ' · เฉลย Mock Exam อยู่ในไฟล์แยกที่หน้าเอกสาร' : ' · เฉลยพร้อมคำอธิบาย'}
              </p>
              <button
                type="button"
                className="download-row"
                onClick={() =>
                  onReadDoc?.({
                    id: part.file,
                    name: partFileName || `พาร์ท ${part.label}`,
                    type: 'PDF',
                  })
                }
              >
                <span className="download-row__ico" style={{ background: 'var(--viol-50)', color: 'var(--viol-600)' }}>
                  <Icon name="book" size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="download-row__title">อ่านเอกสารในเว็บไซต์</span>
                  <span className="download-row__desc">เปิดอ่านได้ทันที ไม่ต้องออกไปที่ Google Drive</span>
                </span>
                <Icon name="chevron" size={16} className="part-chev" />
              </button>
              <a
                className="download-row"
                href={driveDownload(part.file)}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <span className="download-row__ico" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>
                  <Icon name="download" size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="download-row__title">ดาวน์โหลดไฟล์ PDF ต้นฉบับ</span>
                  <span className="download-row__desc">เปิดจาก Google Drive · ต้นฉบับไม่มีการแก้ไข</span>
                </span>
                <Icon name="external" size={16} className="part-chev" />
              </a>
            </div>
          </section>
        </div>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">หัวข้อที่ออกสอบ</h3>
            <span className="section__link" style={{ color: 'var(--muted)' }}>
              อ้างอิงฉบับจริง {part.officialCount} ข้อ
            </span>
          </div>
          <div className="topic-chips">
            {part.topics.map((t, i) => (
              <span className="chip" key={i} style={{ animation: `fadeUp .5s var(--ease) ${i * 40}ms both` }}>
                {t}
              </span>
            ))}
          </div>
        </section>

        {rows.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h3 className="section__title">ประวัติการทำพาร์ทนี้</h3>
            </div>
            {rows.slice(0, 4).map((r, i) => (
              <div className="source-item" key={r.id}>
                <span
                  className="source-item__ico"
                  style={{ background: 'var(--viol-50)', color: 'var(--viol-700)', fontFamily: 'Inter' }}
                >
                  {Math.round(r.score)}
                </span>
                <div>
                  <div className="source-item__title">
                    {r.correct}/{r.total} ข้อ · ใช้เวลา {r.timeUsedText || humanTime(r.timeUsedSec)}
                  </div>
                  <div className="source-item__meta">{formatThaiDateTime(r.date)}</div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="quiz-foot quiz-foot--split">
        {activeAttempt && (
          <button className="btn btn--soft" onClick={() => onRestart?.(part.id, currentOpts)}>
            <Icon name="refresh" size={15} /> เริ่มใหม่
          </button>
        )}
        <button
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={() => onStart(part.id, currentOpts)}
        >
          <Icon name="play" size={16} />{' '}
          {activeAttempt
            ? `ทำต่อ (${answered}/${currentCount} ข้อ)`
            : selectedCount === 'all'
              ? 'เริ่มทำข้อสอบ'
              : `เริ่มทำข้อสอบ (${batchLabel})`}
        </button>
      </div>
    </>
  )
}
