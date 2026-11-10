import { useEffect, useRef, useState } from 'react'
import { driveDownload } from '../data/index.js'
import { formatThaiDateTime, humanTime, mmss } from '../lib/storage.js'
import { downloadResultImage, downloadResultPdf } from '../lib/pdf.js'
import { certTier } from '../lib/certs.js'
import { CertificateView, CertSheet } from './Certificate.jsx'
import Icon from './Icons.jsx'
import { Confetti } from './ui.jsx'

const LETTERS = ['ก', 'ข', 'ค', 'ง']

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

export default function Result({
  result,
  part,
  profileName,
  onHome,
  onRetry,
  onHistory,
  onOpenSources,
  onToast,
  onRename,
}) {
  const [open, setOpen] = useState(-1)
  const [busy, setBusy] = useState('')
  const [certOpen, setCertOpen] = useState(false)
  const [examinee, setExaminee] = useState(result.name || profileName || '')
  const isSet = result.kind === 'set'
  const title = isSet ? result.setName || 'ชุดสอบเสมือนจริง' : `${result.partLabel} · ${result.partTitle}`
  const animated = useCountUp(result.score)
  const [ringP, setRingP] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setRingP(Math.max(0, Math.min(100, result.score))), 160)
    return () => clearTimeout(id)
  }, [result.score])
  const passed = result.score >= 60
  const excellent = result.score >= 85
  const earnedCert =
    !isSet && passed && result.partId
      ? {
          partId: result.partId,
          partLabel: result.partLabel,
          partTitle: result.partTitle,
          partColor: result.partColor || part?.color || '#2563EB',
          score: result.score,
          correct: result.correct,
          total: result.total,
          name: examinee.trim() || result.name || profileName || 'ผู้เข้าสอบ',
          date: result.date,
          earnedDate: result.date,
          ...certTier(result.score),
        }
      : null

  const dateText = formatThaiDateTime(result.date)
  const timeUsedText = humanTime(result.timeUsedSec)
  const durationText = humanTime(result.durationSec)

  const pdfPayload = {
    ...result,
    dateText,
    timeUsedText,
    durationText,
    name: examinee.trim() || 'ผู้เข้าสอบ',
  }

  const handlePdf = async () => {
    setBusy('pdf')
    try {
      if (examinee.trim() && onRename) onRename(examinee.trim())
      await downloadResultPdf(
        pdfPayload,
        `BACC-ผลสอบ-${(result.setName || result.partLabel || 'exam').replace(/\s+/g, '-')}-${Math.round(
          result.score,
        )}คะแนน.pdf`,
      )
      onToast?.('ดาวน์โหลดรายงาน PDF แล้ว')
    } finally {
      setBusy('')
    }
  }

  const handlePng = () => {
    setBusy('png')
    downloadResultImage(
      pdfPayload,
      `BACC-ผลสอบ-${(result.setName || result.partLabel || 'exam').replace(/\s+/g, '-')}-${Math.round(
        result.score,
      )}คะแนน.png`,
    )
    setTimeout(() => {
      setBusy('')
      onToast?.('บันทึกรูปภาพผลสอบแล้ว')
    }, 400)
  }

  const badgeText = excellent
    ? 'ยอดเยี่ยม · พร้อมสำหรับการสอบจริง'
    : passed
      ? 'ผ่านเกณฑ์การประเมิน'
      : 'ควรทบทวนเพิ่มเติม'

  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onHome} aria-label="กลับหน้าแรก">
          <Icon name="back" size={20} />
        </button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>
            ผลการทดสอบ
          </h1>
          <p className="brand__sub">{title}</p>
        </div>
        <button className="icon-btn" onClick={onHistory} aria-label="ประวัติผลสอบ">
          <Icon name="award" size={18} />
        </button>
      </header>

      <div style={{ padding: '6px 0 0' }}>
        <div className="result-hero" style={{ position: 'relative' }}>
          {passed && <Confetti />}
          <div className="score-ring" style={{ '--p': ringP }}>
            <svg viewBox="0 0 120 120">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="60%" stopColor="#9B7BFF" />
                  <stop offset="100%" stopColor="#93C5FD" />
                </linearGradient>
              </defs>
              <circle className="score-ring__track" cx="60" cy="60" r="54" fill="none" strokeWidth="11" pathLength="100" />
              <circle className="score-ring__bar" cx="60" cy="60" r="54" fill="none" strokeWidth="11" pathLength="100" />
            </svg>
            <div className="score-ring__inner">
              <div className="score-ring__value num">{Math.round(animated)}</div>
              <div className="score-ring__unit">
                {result.maxPoints && isSet
                  ? `${Math.round(result.points)}/${result.maxPoints} คะแนน`
                  : 'คะแนนจาก 100'}
              </div>
            </div>
          </div>

          <div className={`result-badge ${passed ? 'result-badge--pass' : 'result-badge--fail'}`}>
            <Icon name={passed ? 'checkCircle' : 'info'} size={15} stroke={2.2} />
            {badgeText}
          </div>

          <p className="sub" style={{ marginTop: 10 }}>
            ตอบถูก {result.correct} จาก {result.total} ข้อ · {dateText}
          </p>
          {result.autoSubmitted && (
            <p
              style={{
                fontSize: 11,
                color: '#b45309',
                background: 'var(--amber-soft)',
                border: '1px solid #fde4b0',
                padding: '6px 12px',
                borderRadius: 999,
                display: 'inline-block',
                marginTop: 8,
              }}
            >
              หมดเวลา — ระบบส่งคำตอบให้อัตโนมัติ
            </p>
          )}
        </div>

        {earnedCert && (
          <button
            type="button"
            className="cert-banner"
            onClick={() => setCertOpen(true)}
            aria-label="เปิดดูเกียรติบัตรฉบับเต็ม"
          >
            <span className="cert-banner__party" aria-hidden="true">🎉</span>
            <span className="cert-banner__body">
              <b>เก่งมาก! คุณได้รับเกียรติบัตร {certTier(result.score).medal}</b>
              <span>สอบผ่านพาร์ท {result.partLabel} · {result.partTitle} — แตะเพื่อดู/ดาวน์โหลดเกียรติบัตร</span>
            </span>
            <span className="cert-banner__cta">
              <Icon name="medal" size={17} /> เปิดดู
            </span>
          </button>
        )}

        <div className="stat-grid">
          <div className="stat-box" style={{ '--i': 0 }}>
            <div className="stat-box__ico" style={{ background: 'var(--mint-soft)', color: '#067a55' }}>
              <Icon name="check" size={16} stroke={2.4} />
            </div>
            <div className="stat-box__num num">{result.correct}</div>
            <div className="stat-box__label">ตอบถูก</div>
          </div>
          <div className="stat-box" style={{ '--i': 1 }}>
            <div className="stat-box__ico" style={{ background: 'var(--coral-soft)', color: '#b42318' }}>
              <Icon name="close" size={15} stroke={2.4} />
            </div>
            <div className="stat-box__num num">{result.wrong}</div>
            <div className="stat-box__label">ตอบผิด</div>
          </div>
          <div className="stat-box" style={{ '--i': 2 }}>
            <div className="stat-box__ico" style={{ background: '#eef4ff', color: 'var(--muted)' }}>
              <Icon name="clock" size={15} />
            </div>
            <div className="stat-box__num num" style={{ fontSize: 14, paddingTop: 3 }}>
              {mmss(result.timeUsedSec)}
            </div>
            <div className="stat-box__label">เวลาที่ใช้</div>
          </div>
        </div>

        {result.sections && result.sections.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h3 className="section__title">สรุปตามรายวิชา</h3>
              <span className="section__link" style={{ color: 'var(--muted)' }}>
                คะแนน · เวลาที่ใช้
              </span>
            </div>
            <div className="info-card">
              {result.sections.map((sec, i) => (
                <div className="sec-result" key={sec.key} style={{ '--sec': sec.color || 'var(--viol-500)', '--i': i }}>
                  <div className="sec-result__top">
                    <span className="sec-result__dot" />
                    <b>{sec.label}</b>
                    <span className="sec-result__pts num">
                      {Math.round(sec.points * 10) / 10}/{sec.maxPoints}
                    </span>
                  </div>
                  <div className="sec-result__bar">
                    <i style={{ width: `${sec.maxPoints ? (sec.points / sec.maxPoints) * 100 : 0}%` }} />
                  </div>
                  <div className="sec-result__meta">
                    <span>
                      ถูก {sec.correct}/{sec.total} ข้อ
                    </span>
                    <span>
                      <Icon name="clock" size={11} /> {humanTime(sec.timeSec || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">สรุปตามหัวข้อ</h3>
            <span className="section__link" style={{ color: 'var(--muted)' }}>
              ถูก / ทั้งหมด
            </span>
          </div>
          <div className="info-card">
            {(result.topics || []).map((t, i) => (
              <div className="topic-row" key={i}>
                <span className="topic-row__name">{t.name}</span>
                <span className="topic-row__val">
                  {t.correct}/{t.total}
                </span>
                <span className="topic-row__bar">
                  <span
                    className="topic-row__fill"
                    style={{
                      width: `${t.total ? (t.correct / t.total) * 100 : 0}%`,
                      display: 'block',
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">ดาวน์โหลดผลการทดสอบ</h3>
          </div>
          <div className="download-card">
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500 }}>รายงานผลอย่างเป็นทางการ</p>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 4 }}>
              ไฟล์ PDF ขนาด A4 ภาษาไทย พร้อมคะแนน สรุปหัวข้อ และวันที่ทดสอบ
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', flex: 'none' }}>ชื่อผู้เข้าสอบ</span>
              <input
                value={examinee}
                onChange={(e) => setExaminee(e.target.value)}
                placeholder="ระบุชื่อ–นามสกุล"
                maxLength={60}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '9px 12px',
                  borderRadius: 12,
                  border: '1.5px solid var(--line)',
                  background: '#f8fbff',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
            </div>
            <button className="download-row" onClick={handlePdf} disabled={busy === 'pdf'}>
              <span className="download-row__ico" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>
                <Icon name="download" size={18} />
              </span>
              <span style={{ flex: 1 }}>
                <span className="download-row__title">
                  {busy === 'pdf' ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลดผลการทดสอบ (PDF)'}
                </span>
                <span className="download-row__desc">A4 · พร้อมพิมพ์หรือส่งต่อ</span>
              </span>
              <Icon name="external" size={15} className="part-chev" />
            </button>
            <button className="download-row" onClick={handlePng} disabled={busy === 'png'}>
              <span className="download-row__ico" style={{ background: 'var(--viol-50)', color: 'var(--viol-600)' }}>
                <Icon name="share" size={18} />
              </span>
              <span style={{ flex: 1 }}>
                <span className="download-row__title">บันทึกเป็นรูปภาพ (PNG)</span>
                <span className="download-row__desc">เหมาะสำหรับแชร์ในโซเชียล</span>
              </span>
              <Icon name="external" size={15} className="part-chev" />
            </button>
            {part?.file && !isSet && (
              <a
                className="download-row"
                href={driveDownload(part.file)}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <span className="download-row__ico" style={{ background: '#eef6ff', color: '#2563eb' }}>
                  <Icon name="docs" size={18} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="download-row__title">ดาวน์โหลดข้อสอบต้นฉบับ (Google Drive)</span>
                  <span className="download-row__desc">{part.id === '2' ? 'พาร์ท 2 อยู่ในวิชาที่ 2 ของคลังข้อสอบ 300 ข้อ' : part.id === 'mock' ? 'ไฟล์ Mock Exam · เฉลยอยู่ในไฟล์แยก' : 'ไฟล์ PDF ฉบับเต็มพร้อมเฉลยจาก Drive'}</span>
                </span>
                <Icon name="external" size={15} className="part-chev" />
              </a>
            )}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">เฉลยและคำอธิบาย</h3>
            <button className="section__link" onClick={() => setOpen(open === -1 ? 0 : -1)}>
              {open === -1 ? 'เปิดข้อแรก' : 'ปิดทั้งหมด'}
            </button>
          </div>
          {(result.items || []).map((item, i) => {
            const isOpen = open === i
            const isCorrect = item.chosen === item.a
            const skipped = item.chosen === null
            return (
              <div className={`review-item ${isOpen ? 'is-open' : ''}`} key={i}>
                <button className="review-head" onClick={() => setOpen(isOpen ? -1 : i)}>
                  <span className={`review-idx ${skipped ? 'review-idx--skip' : isCorrect ? 'review-idx--ok' : 'review-idx--no'}`}>
                    {i + 1}
                  </span>
                  <span className="review-q">{item.q}</span>
                  <span style={{ color: isCorrect ? 'var(--mint)' : skipped ? 'var(--muted)' : 'var(--coral)', paddingTop: 2, flex: 'none' }}>
                    <Icon name={skipped ? 'info' : isCorrect ? 'checkCircle' : 'close'} size={17} stroke={2} />
                  </span>
                </button>
                {isOpen && (
                  <div className="review-body">
                    {item.fig && (
                      <div className="q-figure" style={{ marginTop: 0 }} dangerouslySetInnerHTML={{ __html: item.fig }} />
                    )}
                    {item.o.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`review-opt ${oi === item.a ? 'is-correct' : ''} ${
                          oi === item.chosen && oi !== item.a ? 'is-chosen-wrong' : ''
                        }`}
                      >
                        <b style={{ fontFamily: 'Inter, sans-serif', marginRight: 6 }}>{LETTERS[oi]}.</b>
                        {opt}
                        {oi === item.chosen && (
                          <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.8 }}>(คำตอบของคุณ)</span>
                        )}
                        {item.ofigs && item.ofigs[oi] && (
                          <div
                            style={{ marginTop: 6, maxWidth: 120 }}
                            dangerouslySetInnerHTML={{ __html: item.ofigs[oi] }}
                          />
                        )}
                      </div>
                    ))}
                    <div className="explain">
                      <b>เฉลย: {LETTERS[item.a]}</b> — {item.e}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        <div className="section" style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn--primary btn--block" onClick={() => onRetry(result)}>
            <Icon name="refresh" size={17} /> {isSet ? 'ทำชุดข้อสอบนี้อีกครั้ง' : 'ทำข้อสอบพาร์ทนี้อีกครั้ง'}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onHistory}>
              <Icon name="award" size={16} /> ผลสอบทั้งหมด
            </button>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onOpenSources}>
              <Icon name="docs" size={16} /> เอกสารต้นฉบับ
            </button>
          </div>
          <button className="btn btn--ghost btn--block" onClick={onHome}>
            <Icon name="home" size={16} /> กลับหน้าแรก
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--muted)', marginTop: 20, lineHeight: 1.7 }}>
          คะแนนนี้เป็นผลจากการฝึกทำข้อสอบในระบบ
          <br />
          ไม่ใช่ผลการสอบอย่างเป็นทางการของ ธ.ก.ส.
        </p>
      </div>

      {certOpen && earnedCert && (
        <CertSheet cert={earnedCert} name={examinee.trim() || profileName} onClose={() => setCertOpen(false)} onToast={onToast} />
      )}
    </>
  )
}
