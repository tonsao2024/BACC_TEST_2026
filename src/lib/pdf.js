/**
 * สร้างไฟล์ PDF รายงานผลการทดสอบ (ภาษาไทย)
 * วิธี: วาดรายงานลง <canvas> ด้วยฟอนต์ของเบราว์เซอร์ (รองรับภาษาไทยสมบูรณ์)
 * แล้วฝังภาพ JPEG ลงในไฟล์ PDF ขนาด A4 ด้วยตัวสร้าง PDF ขนาดเล็กที่เขียนขึ้นเอง
 */

import { downloadBlob } from './storage.js'

const A4 = { w: 595.28, h: 841.89 }
const CANVAS = { w: 1240, h: 1754 } // ~150 dpi, สัดส่วน A4

const FONT = (weight, size) =>
  `${weight} ${size}px "IBM Plex Sans Thai", "Noto Sans Thai", "Sarabun", sans-serif`

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const words = String(text).split(/\s+/)
  let line = ''
  let lines = 0
  for (let i = 0; i < words.length; i += 1) {
    const test = line ? `${line} ${words[i]}` : words[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight)
      lines += 1
      line = words[i]
      if (lines >= maxLines) return lines
    } else {
      line = test
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight)
    lines += 1
  }
  return lines
}

/* ---------- PDF writer (ฝังภาพ JPEG 1 หน้า) ---------- */
function buildPdf(jpegBytes, imgW, imgH) {
  const enc = (str) => {
    const out = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i) & 0xff
    return out
  }

  const content = `q\n${A4.w} 0 0 ${A4.h} 0 0 cm\n/Im0 Do\nQ\n`

  const chunks = []
  const offsets = []
  let pos = 0

  const push = (data) => {
    const bytes = typeof data === 'string' ? enc(data) : data
    chunks.push(bytes)
    pos += bytes.length
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')

  const addObject = (num, body) => {
    offsets[num] = pos
    push(`${num} 0 obj\n${body}\nendobj\n`)
  }

  const addStreamObject = (num, dict, streamBytes) => {
    offsets[num] = pos
    push(`${num} 0 obj\n${dict}\nstream\n`)
    push(streamBytes)
    push('\nendstream\nendobj\n')
  }

  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>')
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>`,
  )
  addStreamObject(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`,
    jpegBytes,
  )
  addStreamObject(5, `<< /Length ${enc(content).length} >>`, content)

  const xrefPos = pos
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  push(xref)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`)

  return new Blob(chunks, { type: 'application/pdf' })
}

/* ---------- วาดหน้ารายงาน ---------- */
function paintReport(result) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS.w
  canvas.height = CANVAS.h
  const ctx = canvas.getContext('2d')

  const pad = 78
  const W = CANVAS.w

  ctx.fillStyle = '#F7F5FF'
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h)

  /* header */
  const grad = ctx.createLinearGradient(0, 0, W, 520)
  grad.addColorStop(0, '#6C4CF1')
  grad.addColorStop(0.55, '#8B5CF6')
  grad.addColorStop(1, '#A97BFF')
  ctx.fillStyle = grad
  roundRect(ctx, 36, 36, W - 72, 470, 46)
  ctx.fill()

  ctx.globalAlpha = 0.16
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(W - 130, 120, 190, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = FONT(700, 30)
  ctx.fillText('BACC EXAM 2569', pad, 128)

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = FONT(400, 24)
  ctx.fillText('ศูนย์ทดสอบออนไลน์ · ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', pad, 168)

  ctx.fillStyle = '#fff'
  ctx.font = FONT(600, 54)
  ctx.fillText('รายงานผลการทดสอบ', pad, 252)

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = FONT(500, 32)
  ctx.fillText(`พาร์ท ${result.partLabel} · ${result.partTitle}`, pad, 306)

  /* score circle */
  const cx = W - 250
  const cy = 372
  const radius = 92
  ctx.lineWidth = 22
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()

  const pct = Math.max(0, Math.min(100, result.score)) / 100
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.font = FONT(700, 62)
  ctx.fillText(String(Math.round(result.score)), cx, cy + 18)
  ctx.font = FONT(400, 22)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText('คะแนน (100)', cx, cy + 52)
  ctx.textAlign = 'left'

  /* meta */
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = FONT(400, 24)
  ctx.fillText(`ผู้เข้าสอบ: ${result.name || 'ไม่ระบุชื่อ'}`, pad, 400)
  ctx.fillText(`วันที่ทำแบบทดสอบ: ${result.dateText}`, pad, 436)
  ctx.fillText(`ใช้เวลาทำ: ${result.timeUsedText} จาก ${result.durationText}`, pad, 472)

  /* stat cards */
  const stats = [
    { label: 'ตอบถูก', value: `${result.correct}/${result.total}`, color: '#10B981' },
    { label: 'ตอบผิด', value: `${result.wrong}`, color: '#FF6B57' },
    { label: 'ไม่ได้ตอบ', value: `${result.skipped}`, color: '#7D7799' },
    { label: 'คะแนน', value: `${Math.round(result.score)}`, color: '#6C4CF1' },
  ]
  const cw = (W - pad * 2 - 3 * 18) / 4
  stats.forEach((s, i) => {
    const x = pad + i * (cw + 18)
    const y = 560
    ctx.fillStyle = '#fff'
    roundRect(ctx, x, y, cw, 148, 26)
    ctx.fill()
    ctx.strokeStyle = 'rgba(25,21,57,0.07)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = s.color
    ctx.font = FONT(700, 42)
    ctx.fillText(String(s.value), x + 24, y + 66)
    ctx.fillStyle = '#7D7799'
    ctx.font = FONT(400, 22)
    ctx.fillText(s.label, x + 24, y + 108)
  })

  /* grade badge */
  const passed = result.score >= 60
  ctx.font = FONT(600, 26)
  const badgeText = passed ? 'ผ่านเกณฑ์การประเมิน' : 'ควรทบทวนเพิ่มเติม'
  const tw = ctx.measureText(badgeText).width
  ctx.fillStyle = passed ? '#E8FBF3' : '#FFF1ED'
  roundRect(ctx, pad, 748, tw + 64, 58, 29)
  ctx.fill()
  ctx.fillStyle = passed ? '#067A55' : '#B42318'
  ctx.fillText(badgeText, pad + 32, 786)

  /* topic breakdown */
  let y = 856
  ctx.fillStyle = '#191539'
  ctx.font = FONT(600, 32)
  ctx.fillText('สรุปผลรายหัวข้อ', pad, y)
  y += 18

  const topics = (result.topics || []).slice(0, 9)
  const bx = pad + 420
  const barMax = W - pad - bx - 96
  topics.forEach((t) => {
    y += 46
    const ratio = t.total ? t.correct / t.total : 0
    ctx.fillStyle = '#3A3460'
    ctx.font = FONT(400, 24)
    ctx.fillText(t.name, pad, y + 8)

    ctx.fillStyle = '#ECE7FF'
    roundRect(ctx, bx, y - 8, barMax, 18, 9)
    ctx.fill()

    const g2 = ctx.createLinearGradient(bx, 0, bx + barMax, 0)
    g2.addColorStop(0, '#8B5CF6')
    g2.addColorStop(1, '#B78BFF')
    ctx.fillStyle = g2
    if (ratio > 0) {
      roundRect(ctx, bx, y - 8, Math.max(18, barMax * ratio), 18, 9)
      ctx.fill()
    }

    ctx.fillStyle = '#7D7799'
    ctx.font = FONT(500, 22)
    ctx.fillText(`${t.correct}/${t.total}`, bx + barMax + 20, y + 8)
  })

  /* footer */
  const footY = CANVAS.h - 150
  ctx.fillStyle = 'rgba(25,21,57,0.06)'
  ctx.fillRect(pad, footY, W - pad * 2, 2)

  ctx.fillStyle = '#7D7799'
  ctx.font = FONT(400, 21)
  drawWrappedText(
    ctx,
    'รายงานนี้สร้างโดยระบบ BACC Exam 2569 · คลังข้อสอบและเอกสารต้นฉบับทั้งหมดดาวน์โหลดได้จาก Google Drive ของชุดเอกสารเตรียมสอบ ธ.ก.ส. 2569',
    pad,
    footY + 48,
    W - pad * 2,
    32,
    2,
  )
  ctx.fillStyle = '#6C4CF1'
  ctx.font = FONT(600, 21)
  ctx.fillText('drive.google.com/drive/folders/1zcaLIPT0u6estLdIFIm-0PPyF2ACkh7f', pad, footY + 118)

  return canvas
}

export async function downloadResultPdf(result, filename) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* ignore */
    }
  }
  const canvas = paintReport(result)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.94)
  const base64 = dataUrl.split(',')[1]
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)

  const blob = buildPdf(bytes, canvas.width, canvas.height)
  downloadBlob(blob, filename || `BACC-ผลสอบ-${result.partLabel}.pdf`)
}

export function downloadResultImage(result, filename) {
  const canvas = paintReport(result)
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename || `BACC-ผลสอบ-${result.partLabel}.png`)
  }, 'image/png')
}
