import { DRIVE_FOLDER_URL, DRIVE_OUTPUT_FOLDER_URL, SOURCE_FILES, SOURCE_GROUPS, driveDownload, driveView } from '../data/index.js'
import Icon from './Icons.jsx'

const TYPE_STYLE = {
  PDF: { bg: '#FFEEEA', fg: '#E23D28' },
  MD: { bg: '#E0F2FE', fg: '#0369A1' },
}

function SourceRow({ file, index, onReadDoc }) {
  const style = TYPE_STYLE[file.type] || TYPE_STYLE.PDF
  const isPdf = file.type === 'PDF'
  return (
    <div className="source-item" style={{ animation: `fadeUp .5s var(--ease) ${index * 35}ms both` }}>
      <span className="source-item__ico" style={{ background: style.bg, color: style.fg }}>{file.type}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="source-item__title">{file.name}</div>
        <div className="source-item__meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--mint)', fontWeight: 500 }}>
            <Icon name="checkCircle" size={11} stroke={2.2} />
            {isPdf ? 'อ่าน PDF ในเว็บไซต์ได้' : 'ไฟล์ข้อความ · เปิดใน Google Drive'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
        {isPdf ? (
          <button type="button" className="icon-btn" onClick={() => onReadDoc?.(file)}
            aria-label={`อ่าน ${file.name} ในเว็บไซต์`} title="อ่านในเว็บไซต์" style={{ width: 34, height: 34, borderRadius: 11 }}>
            <Icon name="book" size={15} />
          </button>
        ) : (
          <a className="icon-btn" href={driveView(file.id)} target="_blank" rel="noreferrer"
            aria-label={`เปิด ${file.name} ใน Google Drive`} title="เปิดใน Google Drive" style={{ width: 34, height: 34, borderRadius: 11 }}>
            <Icon name="external" size={15} />
          </a>
        )}
        <a className="icon-btn" href={driveDownload(file.id)} target="_blank" rel="noreferrer"
          aria-label={`ดาวน์โหลด ${file.name}`} title="ดาวน์โหลด" style={{ width: 34, height: 34, borderRadius: 11 }}>
          <Icon name="download" size={15} />
        </a>
      </div>
    </div>
  )
}

export default function Sources({ onBack, onToast, onReadDoc }) {
  const pdfCount = SOURCE_FILES.filter((f) => f.type === 'PDF').length
  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onBack} aria-label="ย้อนกลับ"><Icon name="back" size={20} /></button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>เอกสารต้นฉบับ</h1>
          <p className="brand__sub">Google Drive · ชุดเตรียมสอบ ธ.ก.ส. 2569</p>
        </div>
      </header>
      <div style={{ padding: '10px 0 0' }}>
        <div className="about-hero">
          <span className="part-hero__badge" style={{ background: 'rgba(255,255,255,.16)' }}><Icon name="docs" size={13} /> คลังเอกสาร</span>
          <h1 style={{ marginTop: 12 }}>เอกสารเตรียมสอบ ธ.ก.ส.</h1>
          <p>รวมประกาศรับสมัคร คลังข้อสอบ Mock Exam เฉลย และเอกสารแยกตามพาร์ท เลือกอ่านหรือดาวน์โหลดได้จากรายการด้านล่าง</p>
          <a className="btn btn--block" href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer"
            style={{ marginTop: 16, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', textDecoration: 'none' }}>
            <Icon name="external" size={16} /> เปิดโฟลเดอร์ Google Drive
          </a>
          <a className="btn btn--block" href={DRIVE_OUTPUT_FOLDER_URL} target="_blank" rel="noreferrer"
            style={{ marginTop: 8, background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', textDecoration: 'none' }}>
            <Icon name="external" size={16} /> เปิดโฟลเดอร์ไฟล์ข้อสอบโดยตรง
          </a>
        </div>
        <section className="section">
          <div className="section__head">
            <h3 className="section__title">เอกสาร PDF ({pdfCount} ไฟล์)</h3>
            <span className="section__link" style={{ color: 'var(--muted)' }}>แตะสมุดเพื่ออ่าน</span>
          </div>
          <p className="sub">พาร์ท 2 ความละเอียดแม่นยำอยู่ในไฟล์คลังข้อสอบ 300 ข้อ (วิชาที่ 2) ไม่มีไฟล์แยก</p>
        </section>
        {SOURCE_GROUPS.map((group) => {
          const files = SOURCE_FILES.filter((file) => file.category === group.id)
          if (!files.length) return null
          return (
            <section className="section" key={group.id}>
              <div className="section__head"><h3 className="section__title">{group.title}</h3><span className="section__link" style={{ color: 'var(--muted)' }}>{files.length} ไฟล์</span></div>
              <div className="info-card" style={{ padding: '4px 16px' }}>
                {files.map((file, index) => <SourceRow key={file.id} file={file} index={index} onReadDoc={onReadDoc} />)}
              </div>
            </section>
          )
        })}
        <section className="section">
          <div className="info-card" style={{ display: 'flex', gap: 12 }}>
            <span className="info-item__ico" style={{ flex: 'none' }}><Icon name="info" size={14} /></span>
            <p className="sub" style={{ margin: 0, fontSize: 11.5 }}>
              ชุดข้อสอบในเว็บไซต์และในเอกสารจัดทำเพื่อฝึกซ้อม ไม่ใช่ข้อสอบจริงของธนาคาร
              การอ่าน PDF ต้องใช้อินเทอร์เน็ต หากแสดงผลไม่ได้ให้ลองเปิดไฟล์ใน Google Drive
            </p>
          </div>
          <button className="btn btn--soft btn--block" style={{ marginTop: 12 }} onClick={() => {
            const all = SOURCE_FILES.filter((f) => f.type === 'PDF').map((f) => driveDownload(f.id)).join('\n')
            if (!navigator.clipboard?.writeText) { onToast?.('คัดลอกไม่สำเร็จ', 'info'); return }
            navigator.clipboard.writeText(all).then(() => onToast?.('คัดลอกลิงก์ PDF ทั้งหมดแล้ว')).catch(() => onToast?.('คัดลอกไม่สำเร็จ', 'info'))
          }}><Icon name="list" size={15} /> คัดลอกลิงก์ดาวน์โหลด PDF ทั้งหมด</button>
        </section>
      </div>
    </>
  )
}
