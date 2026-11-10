import { useEffect, useState } from 'react'
import { driveDownload, driveView } from '../data/index.js'
import Icon from './Icons.jsx'

/**
 * DocReader — อ่านเอกสารต้นฉบับ (PDF เท่านั้น) ในหน้าเว็บ
 * ใช้ Google Drive PDF preview ในกรอบของเว็บ พร้อมตัวเลือกไฟล์และสถานะการโหลด
 */
export default function DocReader({ doc, files = [], onSelect, onClose }) {
  const [status, setStatus] = useState('loading')
  const pdfFiles = files.filter((f) => f.type === 'PDF')
  const isPdf = (doc?.type || 'PDF') === 'PDF'

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    setStatus('loading')
    const t = setTimeout(() => setStatus((s) => (s === 'loading' ? 'slow' : s)), 9000)
    return () => clearTimeout(t)
  }, [doc?.id])

  if (!doc) return null

  return (
    <div className="reader" role="dialog" aria-modal="true" aria-label={`อ่านเอกสาร ${doc.name}`}>
      <header className="reader__bar">
        <button className="reader__back" onClick={onClose} aria-label="ย้อนกลับไปหน้ารายการเอกสาร">
          <Icon name="back" size={18} />
          <span>ย้อนกลับ</span>
        </button>
        <div className="reader__title">
          <p>อ่านในเว็บไซต์</p>
          <h2>{doc.name}</h2>
        </div>
        <span className="reader__badge">PDF</span>
        <a
          className="icon-btn"
          href={driveDownload(doc.id)}
          target="_blank"
          rel="noreferrer"
          aria-label="ดาวน์โหลด PDF"
        >
          <Icon name="download" size={17} />
        </a>
        <a
          className="icon-btn"
          href={driveView(doc.id)}
          target="_blank"
          rel="noreferrer"
          aria-label="เปิดในแท็บใหม่"
        >
          <Icon name="external" size={16} />
        </a>
        <button className="reader__close" onClick={onClose} aria-label="ปิดเอกสาร">
          <Icon name="close" size={18} />
        </button>
      </header>

      <div className="reader__body">
        {pdfFiles.length > 1 && (
          <aside className="reader__list" aria-label="รายการไฟล์ PDF">
            <p className="reader__list-title">ไฟล์ PDF ({pdfFiles.length})</p>
            {pdfFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`reader__file ${f.id === doc.id ? 'is-on' : ''}`}
                onClick={() => onSelect?.(f)}
                title={f.name}
              >
                <Icon name="docs" size={13} />
                <span>{f.name}</span>
              </button>
            ))}
          </aside>
        )}

        <div className="reader__stage">
          {!isPdf ? (
            <div className="reader__blocked">
              <Icon name="lock" size={30} />
              <b>เปิดอ่านในเว็บได้เฉพาะไฟล์ PDF</b>
              <span>ไฟล์นี้เป็นเอกสาร Markdown — ดาวน์โหลดเพื่อเปิดด้วยโปรแกรมอ่านข้อความ</span>
              <a className="btn btn--soft btn--sm" href={driveDownload(doc.id)} target="_blank" rel="noreferrer">
                <Icon name="download" size={14} /> ดาวน์โหลดไฟล์
              </a>
            </div>
          ) : (
            <>
              {status !== 'ready' && (
                <div className="reader__loader">
                  <span className="spinner" />
                  <p>กำลังเปิดเอกสาร PDF…</p>
                  <small>โหลดครั้งแรกอาจใช้เวลาสักครู่</small>
                </div>
              )}
              <iframe
                key={doc.id}
                className={`reader__frame ${status === 'ready' ? 'is-ready' : ''}`}
                src={`https://drive.google.com/file/d/${doc.id}/preview`}
                title={doc.name}
                onLoad={() => setStatus('ready')}
                allow="autoplay"
                referrerPolicy="no-referrer"
              />

              <span className="reader__hint" aria-hidden="true">
                <Icon name="info" size={12} /> ถ้าเอกสารไม่แสดง ให้แตะปุ่ม ↗ เปิดในแท็บใหม่
              </span>

              {status === 'slow' && (
                <div className="reader__slow">
                  <Icon name="info" size={14} />
                  <span>เอกสารใช้เวลาโหลดนานกว่าปกติ — ตรวจสอบอินเทอร์เน็ตหรือเปิดในแท็บใหม่</span>
                  <a className="btn btn--soft btn--sm" href={driveView(doc.id)} target="_blank" rel="noreferrer">
                    เปิดในแท็บใหม่
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="reader__foot">
        <span>
          <Icon name="book" size={14} /> เลื่อน/สองนิ้วเพื่อซูมในกรอบได้ · เอกสารต้นฉบับไม่ถูกแก้ไข
        </span>
        <button type="button" className="btn btn--soft btn--sm reader__foot-close" onClick={onClose}>
          <Icon name="close" size={14} /> ปิดเอกสาร
        </button>
        <span className="reader__copy">© 2569 Ton Skywalker · ห้ามเผยแพร่</span>
      </footer>
    </div>
  )
}
