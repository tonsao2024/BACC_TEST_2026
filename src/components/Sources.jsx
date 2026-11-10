import { DRIVE_FOLDER_ID, SOURCE_FILES, driveDownload } from '../data/index.js'
import Icon from './Icons.jsx'

const TYPE_STYLE = {
  PDF: { bg: '#FFEEEA', fg: '#E23D28' },
  MD: { bg: '#E0F2FE', fg: '#0369A1' },
}

export default function Sources({ onBack, onToast, onReadDoc }) {
  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onBack} aria-label="ย้อนกลับ">
          <Icon name="back" size={20} />
        </button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>
            เอกสารต้นฉบับ
          </h1>
          <p className="brand__sub">Google Drive · ชุดเตรียมสอบ ธ.ก.ส. 2569</p>
        </div>
      </header>

      <div style={{ padding: '10px 0 0' }}>
        <div className="about-hero">
          <span className="part-hero__badge" style={{ background: 'rgba(255,255,255,.16)' }}>
            <Icon name="docs" size={13} /> คลังเอกสารต้นฉบับ
          </span>
          <h1 style={{ marginTop: 12 }}>ข้อสอบ 1,100 ข้อ + Mock Exam 230 ข้อ</h1>
          <p>
            เอกสารทั้งหมดถูกเก็บไว้ในโฟลเดอร์ Google Drive เดียวกัน ประกอบด้วยข้อสอบแยก 11 พาร์ท
            พาร์ทละ 100 ข้อ เฉลยพร้อมคำอธิบาย Mock Exam 230 ข้อ และรายงานตรวจสอบคุณภาพข้อสอบ
          </p>
          <a
            className="btn btn--block"
            href={`https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 16,
              background: 'rgba(255,255,255,.16)',
              border: '1px solid rgba(255,255,255,.25)',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <Icon name="external" size={16} /> เปิดโฟลเดอร์ Google Drive
          </a>
        </div>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">ไฟล์ทั้งหมด ({SOURCE_FILES.length})</h3>
            <span className="section__link" style={{ color: 'var(--muted)' }}>
              แตะสมุดเพื่ออ่านในเว็บไซต์
            </span>
          </div>
          <div className="info-card" style={{ padding: '4px 16px' }}>
            {SOURCE_FILES.map((f, i) => {
              const style = TYPE_STYLE[f.type] || TYPE_STYLE.PDF
              return (
                <div className="source-item" key={f.id} style={{ animation: `fadeUp .5s var(--ease) ${i * 35}ms both` }}>
                  <span className="source-item__ico" style={{ background: style.bg, color: style.fg }}>
                    {f.type}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="source-item__title">{f.name}</div>
                    <div className="source-item__meta">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: 'var(--mint)',
                          fontWeight: 500,
                        }}
                      >
                        <Icon name="checkCircle" size={11} stroke={2.2} />{' '}
                        {f.type === 'PDF' ? 'อ่าน PDF ในเว็บไซต์ได้' : 'ไฟล์ข้อความ — ดาวน์โหลดเท่านั้น'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => onReadDoc?.(f)}
                      aria-label={`อ่าน ${f.name} ในเว็บไซต์`}
                      title={f.type === 'PDF' ? 'อ่านในเว็บไซต์' : 'เปิดอ่านได้เฉพาะไฟล์ PDF'}
                      style={{ width: 34, height: 34, borderRadius: 11, opacity: f.type === 'PDF' ? 1 : 0.45 }}
                    >
                      <Icon name="book" size={15} />
                    </button>
                    <a
                      className="icon-btn"
                      href={driveDownload(f.id)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`ดาวน์โหลด ${f.name}`}
                      style={{ width: 34, height: 34, borderRadius: 11 }}
                    >
                      <Icon name="download" size={15} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="section">
          <div className="info-card" style={{ display: 'flex', gap: 12 }}>
            <span className="info-item__ico" style={{ flex: 'none' }}>
              <Icon name="info" size={14} />
            </span>
            <p className="sub" style={{ margin: 0, fontSize: 11.5 }}>
              ข้อสอบในเว็บไซต์นี้เรียบเรียงขึ้นใหม่ตามโครงสร้างและหัวข้อเดียวกับเอกสารต้นฉบับ
              เพื่อใช้ฝึกฝนบนมือถือได้สะดวก หากต้องการข้อสอบฉบับเต็ม 1,100 ข้อ
              พร้อมเฉลยละเอียด กรุณาดาวน์โหลดจาก Google Drive ด้านบน
            </p>
          </div>
          <button
            className="btn btn--soft btn--block"
            style={{ marginTop: 12 }}
            onClick={() => {
              const all = SOURCE_FILES.filter((f) => f.type === 'PDF')
                .map((f) => `https://drive.google.com/uc?export=download&id=${f.id}`)
                .join('\n')
              navigator.clipboard
                ?.writeText(all)
                .then(() => onToast?.('คัดลอกลิงก์ไฟล์ทั้งหมดแล้ว'))
                .catch(() => onToast?.('คัดลอกไม่สำเร็จ', 'info'))
            }}
          >
            <Icon name="list" size={15} /> คัดลอกลิงก์ดาวน์โหลดทั้งหมด
          </button>
        </section>
      </div>
    </>
  )
}
