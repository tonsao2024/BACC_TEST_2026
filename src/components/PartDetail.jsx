import { driveDownload, driveView } from '../data/index.js'
import { bestFor, formatThaiDateTime } from '../lib/storage.js'
import Icon from './Icons.jsx'
import { MiniRing } from './ui.jsx'

const RULES = [
  'แต่ละข้อมี 4 ตัวเลือก เลือกได้เพียงคำตอบเดียว ไม่มีคะแนนติดลบ',
  'ระบบจะจับเวลาและส่งคำตอบอัตโนมัติเมื่อหมดเวลา',
  'สามารถย้อนกลับไปแก้ไขข้อก่อนหน้าได้ก่อนกดส่งคำตอบ',
  'หลังส่งคำตอบจะเห็นเฉลยและคำอธิบายทุกข้อ พร้อมดาวน์โหลดรายงานผล',
]

export default function PartDetail({
  part,
  results,
  attempt,
  onBack,
  onStart,
  onRestart,
  onReadDoc,
  onOpenSources,
  partFileName,
}) {
  const best = bestFor(part.id, results)
  const rows = results.filter((r) => r.partId === part.id)
  const answered = attempt ? (attempt.answers || []).filter((a) => a !== null).length : 0

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
              <b className="num">{part.questions.length}</b>
              <span>ข้อสอบ</span>
            </div>
            <div className="part-hero__cell">
              <b className="num">{part.minutes}</b>
              <span>นาที</span>
            </div>
            <div className="part-hero__cell">
              <b className="num">100</b>
              <span>คะแนนเต็ม</span>
            </div>
          </div>
        </div>

        {best && (
          <div
            className="info-card"
            style={{
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              animation: 'fadeUp .5s var(--ease) both',
            }}
          >
            <MiniRing value={best.score} size={56} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>ผลดีที่สุดของคุณ</p>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 3 }}>
                {best.correct}/{best.total} ข้อ · {formatThaiDateTime(best.date)}
              </p>
            </div>
            <span
              className={`result-badge ${best.score >= 60 ? 'result-badge--pass' : 'result-badge--fail'}`}
              style={{ marginTop: 0, padding: '6px 11px', fontSize: 11 }}
            >
              {Math.round(best.score)} คะแนน
            </span>
          </div>
        )}

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
                  เวลาที่ใช้: <b className="num">{part.minutes} นาที</b> · คะแนนผ่านเกณฑ์ 60 คะแนน
                </span>
              </div>
            </div>
          </div>
        </section>

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

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">เอกสารต้นฉบับ</h3>
          </div>
          <div className="download-card">
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500 }}>ไฟล์ข้อสอบฉบับเต็ม</p>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 4 }}>
              {partFileName || `${part.label}_ข้อสอบ_${part.officialCount}ข้อ.pdf`} · เฉลยพร้อมคำอธิบาย
            </p>
            <button
              type="button"
              className="download-row"
              onClick={() => onReadDoc?.({ id: part.file, name: partFileName || `พาร์ท ${part.label}` })}
            >
              <span className="download-row__ico" style={{ background: 'var(--viol-50)', color: 'var(--viol-600)' }}>
                <Icon name="book" size={18} />
              </span>
              <span style={{ flex: 1 }}>
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
              <span style={{ flex: 1 }}>
                <span className="download-row__title">ดาวน์โหลดไฟล์ PDF ต้นฉบับ</span>
                <span className="download-row__desc">เปิดจาก Google Drive · ต้นฉบับไม่มีการแก้ไข</span>
              </span>
              <Icon name="external" size={16} className="part-chev" />
            </a>
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
                    {r.correct}/{r.total} ข้อ · ใช้เวลา {r.timeUsedText}
                  </div>
                  <div className="source-item__meta">{formatThaiDateTime(r.date)}</div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="quiz-foot quiz-foot--split" style={{ position: 'sticky', bottom: 0 }}>
        {attempt && (
          <button className="btn btn--soft" onClick={() => onRestart?.(part.id)}>
            <Icon name="refresh" size={15} /> เริ่มใหม่
          </button>
        )}
        <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => onStart(part.id)}>
          <Icon name="play" size={16} />{' '}
          {attempt ? `ทำต่อ (${answered}/${part.questions.length})` : 'เริ่มทำข้อสอบ'}
        </button>
      </div>
    </>
  )
}
