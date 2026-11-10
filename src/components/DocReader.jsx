import { useEffect, useState } from 'react'
import { driveDownload, driveView } from '../data/index.js'
import Icon from './Icons.jsx'

/**
 * DocReader — อ่านเอกสารต้นฉบับในหน้าเว็บ (ไม่ต้องเด้งออกไป Google Drive)
 * ใช้ Google Drive preview ในกรอบ iframe + ปุ่มสำรองสำหรับดาวน์โหลด/เปิดแท็บใหม่
 */
export default function DocReader({ doc, onClose }) {
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => setSlow(true), 7000)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
    }
  }, [onClose])

  if (!doc) return null

  return (
    <div className="reader" role="dialog" aria-modal="true" aria-label={`อ่านเอกสาร ${doc.name}`}>
      <header className="reader__bar">
        <button className="icon-btn icon-btn--ghost" onClick={onClose} aria-label="ปิดเอกสาร">
          <Icon name="close" size={20} />
        </button>
        <div className="reader__title">
          <p>อ่านในเว็บไซต์</p>
          <h2>{doc.name}</h2>
        </div>
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
          aria-label="เปิดใน Google Drive"
        >
          <Icon name="external" size={16} />
        </a>
      </header>

      <div className="reader__stage">
        {!ready && (
          <div className="reader__loader">
            <span className="spinner" />
            <p>กำลังเปิดเอกสาร…</p>
            <small>โหลดครั้งแรกอาจใช้เวลาสักครู่</small>
          </div>
        )}
        <iframe
          key={doc.id}
          className={`reader__frame ${ready ? 'is-ready' : ''}`}
          src={`https://drive.google.com/file/d/${doc.id}/preview`}
          title={doc.name}
          onLoad={() => setReady(true)}
          allow="autoplay; fullscreen"
          referrerPolicy="no-referrer"
        />
      </div>

      <footer className="reader__foot">
        <span>
          <Icon name="info" size={14} />
          {slow ? (
            <>ถ้าเอกสารไม่แสดง ตรวจสอบอินเทอร์เน็ตหรือเปิดไฟล์โดยตรงจากปุ่มด้านล่าง</>
          ) : (
            <>ปัด/เลื่อนในกรอบเพื่ออ่านเอกสาร · เอกสารต้นฉบับไม่ถูกแก้ไข</>
          )}
        </span>
        <a className="btn btn--soft btn--sm" href={driveDownload(doc.id)} target="_blank" rel="noreferrer">
          <Icon name="download" size={14} /> ดาวน์โหลด PDF
        </a>
      </footer>
    </div>
  )
}
