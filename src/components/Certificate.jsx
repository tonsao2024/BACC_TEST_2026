import { useState } from 'react'
import { formatThaiDate } from '../lib/storage.js'
import { downloadCertificateImage, downloadCertificatePdf } from '../lib/pdf.js'
import Icon from './Icons.jsx'
import { Sheet } from './ui.jsx'

/**
 * การ์ดเกียรติบัตร (มุมมองในแอป) — ดีไซน์น่ารัก โทนครีม + เหรียญระดับ
 */
export function CertificateView({ cert, name, compact = false }) {
  const who = name || cert.name || 'ผู้เข้าทดสอบ'
  return (
    <div
      className={`cert cert--${cert.key === 'gold' ? 'gold' : cert.key === 'silver' ? 'silver' : 'bronze'} ${compact ? 'cert--compact' : ''}`}
      style={{ '--cert-color': cert.partColor || '#2563EB' }}
      role="img"
      aria-label={`เกียรติบัตร${cert.partTitle} ของ ${who}`}
    >
      <span className="cert__spark cert__spark--1" aria-hidden="true">✦</span>
      <span className="cert__spark cert__spark--2" aria-hidden="true">✦</span>
      <span className="cert__spark cert__spark--3" aria-hidden="true">✦</span>
      <span className="cert__medal" aria-hidden="true">{cert.medal}</span>
      <h3 className="cert__title">เกียรติบัตร</h3>
      <p className="cert__to">ขอมอบให้แก่</p>
      <p className="cert__name">{who}</p>
      <p className="cert__for">ด้วยสอบผ่านเกณฑ์ 60% วิชา</p>
      <p className="cert__part">พาร์ท {cert.partLabel} · {cert.partTitle}</p>
      <p className="cert__score">
        ผลคะแนน <b>{Math.round(cert.score)}%</b>
      </p>
      <span className="cert__tier">{cert.label}</span>
      <p className="cert__date">ออกให้เมื่อ {formatThaiDate(cert.earnedDate || cert.date)}</p>
    </div>
  )
}

/**
 * การ์ดย่อในหน้าประวัติ — แตะเพื่อดูใบเกียรติบัตรใหญ่
 */
export function CertMiniCard({ cert, name, onOpen, index = 0 }) {
  return (
    <button
      type="button"
      className={`cert-mini cert-mini--${cert.key}`}
      style={{ '--i': index }}
      onClick={() => onOpen?.(cert)}
      aria-label={`ดูเกียรติบัตรพาร์ท ${cert.partLabel} ${cert.partTitle}`}
    >
      <span className="cert-mini__medal" aria-hidden="true">{cert.medal}</span>
      <span className="cert-mini__body">
        <b>พาร์ท {cert.partLabel}</b>
        <span>{cert.partTitle}</span>
        <i>
          {Math.round(cert.score)}% · {formatThaiDate(cert.earnedDate || cert.date)}
        </i>
      </span>
      <span className="cert-mini__shine" aria-hidden="true" />
      {name ? null : null}
    </button>
  )
}

/**
 * Sheet ดูเกียรติบัตรเต็มใบ + ดาวน์โหลด
 */
export function CertSheet({ cert, name, onClose, onToast }) {
  const [busy, setBusy] = useState('')
  if (!cert) return null
  const who = name || cert.name || 'ผู้เข้าทดสอบ'
  const fileBase = `BACC-เกียรติบัตร-พาร์ท${cert.partLabel}-${who.replace(/\s+/g, '-')}`
  const payload = { ...cert, name: who }

  return (
    <Sheet onClose={onClose} title="เกียรติบัตรของคุณ 🎉">
      <div className="cert-sheet">
        <CertificateView cert={cert} name={who} />
        <div className="cert-sheet__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy !== ''}
            onClick={async () => {
              setBusy('pdf')
              try {
                await downloadCertificatePdf(payload, `${fileBase}.pdf`)
                onToast?.('ดาวน์โหลดเกียรติบัตร PDF แล้ว')
              } finally {
                setBusy('')
              }
            }}
          >
            <Icon name="download" size={16} /> PDF
          </button>
          <button
            type="button"
            className="btn btn--soft"
            disabled={busy !== ''}
            onClick={async () => {
              setBusy('png')
              try {
                await downloadCertificateImage(payload, `${fileBase}.png`)
                onToast?.('บันทึกเกียรติบัตรรูปภาพแล้ว')
              } finally {
                setBusy('')
              }
            }}
          >
            <Icon name="image" size={16} /> รูปภาพ
          </button>
        </div>
        <p className="cert-sheet__hint">
          เกียรติบัตรจะออกให้ทุกวิชาย่อยที่ทำคะแนนได้ตั้งแต่ 60% ขึ้นไป<br />
          เก็บสะสมให้ครบทุกพาร์ทเพื่อความพร้อมสูงสุดก่อนสอบจริงนะ!
        </p>
      </div>
    </Sheet>
  )
}
