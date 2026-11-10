import { useState } from 'react'
import { formatThaiDateTime, mmss } from '../lib/storage.js'
import { downloadResultPdf } from '../lib/pdf.js'
import Icon from './Icons.jsx'
import { Sheet } from './ui.jsx'

export default function History({ results, onBack, onOpenResult, onClear, onBrowseParts, onToast }) {
  const [confirm, setConfirm] = useState(false)
  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0
  const best = results.length ? results.reduce((a, b) => (a.score > b.score ? a : b)) : null

  const download = async (r) => {
    await downloadResultPdf(
      {
        ...r,
        dateText: formatThaiDateTime(r.date),
        timeUsedText: `${Math.floor(r.timeUsedSec / 60)} นาที ${r.timeUsedSec % 60} วินาที`,
        durationText: `${Math.floor(r.durationSec / 60)} นาที`,
        name: r.name || 'ผู้เข้าสอบ',
      },
      `BACC-ผลสอบ-${r.partLabel}-${Math.round(r.score)}คะแนน.pdf`,
    )
    onToast?.('ดาวน์โหลดรายงาน PDF แล้ว')
  }

  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onBack} aria-label="ย้อนกลับ">
          <Icon name="back" size={20} />
        </button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>
            ผลการทดสอบของฉัน
          </h1>
          <p className="brand__sub">{results.length} ครั้ง · บันทึกไว้ในเครื่องนี้</p>
        </div>
        {results.length > 0 && (
          <button className="icon-btn" onClick={() => setConfirm(true)} aria-label="ล้างประวัติ">
            <Icon name="trash" size={18} />
          </button>
        )}
      </header>

      <div style={{ padding: '10px 0 0' }}>
        {results.length === 0 ? (
          <div className="empty">
            <div className="empty__ico">
              <Icon name="award" size={30} style={{ color: 'var(--viol-400)' }} />
            </div>
            <h3>ยังไม่มีผลการทดสอบ</h3>
            <p>เริ่มทำข้อสอบพาร์ทแรก แล้วผลการทดสอบจะถูกบันทึกไว้ให้ดาวน์โหลดได้ทันที</p>
            <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={onBrowseParts}>
              <Icon name="grid" size={16} /> เลือกพาร์ทสอบ
            </button>
          </div>
        ) : (
          <>
            <div className="hero" style={{ margin: 0 }}>
              <span className="hero__eyebrow">
                <Icon name="chart" size={13} /> สรุปภาพรวม
              </span>
              <div className="hero__row" style={{ marginTop: 14 }}>
                <div className="hero__stats">
                  <div>
                    <div className="hero__stat-num num">{results.length}</div>
                    <div className="hero__stat-label">ครั้งที่ทำ</div>
                  </div>
                  <div>
                    <div className="hero__stat-num num">{avg}</div>
                    <div className="hero__stat-label">คะแนนเฉลี่ย</div>
                  </div>
                  <div>
                    <div className="hero__stat-num num">{best ? Math.round(best.score) : 0}</div>
                    <div className="hero__stat-label">สูงสุด</div>
                  </div>
                </div>
              </div>
            </div>

            <section className="section">
              <div className="section__head">
                <h3 className="section__title">ทั้งหมด</h3>
              </div>
              {results.map((r, i) => (
                <div className="hist-card" key={r.id} style={{ '--i': i }}>
                  <button
                    className="hist-score"
                    style={{
                      background: r.score >= 60 ? 'var(--mint-soft)' : 'var(--coral-soft)',
                      color: r.score >= 60 ? '#067a55' : '#b42318',
                      border: 'none',
                    }}
                    onClick={() => onOpenResult(r)}
                  >
                    {Math.round(r.score)}
                  </button>
                  <button
                    className="hist-body"
                    onClick={() => onOpenResult(r)}
                    style={{ background: 'none', textAlign: 'left' }}
                  >
                    <span className="hist-title">
                      {r.partLabel} · {r.partTitle}
                    </span>
                    <span className="hist-sub">
                      <Icon name="clock" size={12} /> {formatThaiDateTime(r.date)}
                    </span>
                    <span className="hist-sub">
                      <Icon name="check" size={12} stroke={2.4} /> {r.correct}/{r.total} ข้อ · ใช้เวลา{' '}
                      {mmss(r.timeUsedSec)}
                    </span>
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => download(r)}
                    aria-label="ดาวน์โหลด PDF"
                    style={{ width: 36, height: 36, borderRadius: 12 }}
                  >
                    <Icon name="download" size={16} />
                  </button>
                </div>
              ))}
            </section>

            <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.7 }}>
              ผลการทดสอบถูกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น
              <br />
              ไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์
            </p>
          </>
        )}
      </div>

      {confirm && (
        <Sheet
          title="ล้างประวัติทั้งหมด?"
          desc="ผลการทดสอบทุกครั้งจะถูกลบออกจากเครื่องนี้อย่างถาวร และไม่สามารถกู้คืนได้"
          onClose={() => setConfirm(false)}
          actions={
            <>
              <button className="btn btn--ghost" onClick={() => setConfirm(false)}>
                ยกเลิก
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  onClear()
                  setConfirm(false)
                  onToast?.('ล้างประวัติแล้ว', 'trash')
                }}
              >
                ล้างทั้งหมด
              </button>
            </>
          }
        />
      )}
    </>
  )
}
