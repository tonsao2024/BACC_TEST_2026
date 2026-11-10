/**
 * PDF engine — สร้างไฟล์ PDF ภาษาไทย بدونไลบรารีภายนอก
 * วาดเนื้อหาลง <canvas> (ใช้ฟอนต์ของเบราว์เซอร์ → ภาษาไทยสมบูรณ์)
 * แล้วฝังภาพ JPEG ลงในไฟล์ PDF หลายหน้า (A4) ด้วยตัวสร้าง PDF ขนาดเล็ก
 */

import { downloadBlob } from './storage.js'

const A4 = { w: 595.28, h: 841.89 }
const PAGE = { w: 1240, h: 1754 } // ~150 dpi (สัดส่วน A4)

const FONT = (weight, size) =>
  `${weight} ${size}px "IBM Plex Sans Thai", "Noto Sans Thai", "Sarabun", sans-serif`

/* ============================================================
   PDF writer (multi-page, JPEG DCTDecode)
   ============================================================ */
function buildPdf(pages) {
  const enc = (str) => {
    const out = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i) & 0xff
    return out
  }

  const objs = new Map()
  let nextId = 1
  const addObj = (body) => {
    const id = nextId
    nextId += 1
    objs.set(id, { body })
    return id
  }
  const addStream = (dict, bytes) => {
    const id = nextId
    nextId += 1
    objs.set(id, { body: dict, bytes })
    return id
  }

  const catalogId = addObj('')
  const pagesId = addObj('')
  const kids = []

  pages.forEach((page) => {
    const imgId = addStream(
      `<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>`,
      page.bytes,
    )
    const pwPoint = page.pw || A4.w
    const phPoint = page.ph || A4.h
    const content = `q\n${pwPoint} 0 0 ${phPoint} 0 0 cm\n/Im0 Do\nQ\n`
    const contentId = addStream(`<< /Length ${enc(content).length} >>`, content)
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pwPoint} ${phPoint}] /Resources << /XObject << /Im0 ${imgId} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentId} 0 R >>`,
    )
    kids.push(`${pageId} 0 R`)
  })

  objs.set(catalogId, { body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` })
  objs.set(pagesId, { body: `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>` })

  const chunks = []
  const offsets = {}
  let pos = 0
  const push = (data) => {
    const bytes = typeof data === 'string' ? enc(data) : data
    chunks.push(bytes)
    pos += bytes.length
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const maxId = nextId - 1
  for (let id = 1; id <= maxId; id += 1) {
    const obj = objs.get(id)
    offsets[id] = pos
    if (obj.bytes) {
      push(`${id} 0 obj\n${obj.body}\nstream\n`)
      push(obj.bytes)
      push('\nendstream\nendobj\n')
    } else {
      push(`${id} 0 obj\n${obj.body}\nendobj\n`)
    }
  }

  const xrefPos = pos
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= maxId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  push(xref)
  push(`trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`)

  return new Blob(chunks, { type: 'application/pdf' })
}

const canvasToJpeg = (canvas, quality = 0.9) => {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const bin = atob(dataUrl.split(',')[1])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return { bytes, w: canvas.width, h: canvas.height }
}

const newCanvas = () => {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE.w
  canvas.height = PAGE.h
  return canvas
}

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/* ---------- text wrapping (รองรับภาษาไทยไม่มีเว้นวรรค) ---------- */
function wrapText(ctx, text, maxWidth) {
  const lines = []
  String(text)
    .split('\n')
    .forEach((para) => {
      if (!para) {
        lines.push('')
        return
      }
      let line = ''
      para.split(/\s+/).forEach((token) => {
        const candidate = line ? `${line} ${token}` : token
        if (ctx.measureText(candidate).width <= maxWidth) {
          line = candidate
          return
        }
        if (line) {
          lines.push(line)
          line = ''
        }
        if (ctx.measureText(token).width <= maxWidth) {
          line = token
          return
        }
        let buf = ''
        for (const ch of token) {
          if (ctx.measureText(buf + ch).width > maxWidth && buf) {
            lines.push(buf)
            buf = ch
          } else {
            buf += ch
          }
        }
        line = buf
      })
      if (line) lines.push(line)
    })
  return lines
}

/* ============================================================
   หน้ารายงานผลการทดสอบ (1 หน้า)
   ============================================================ */
function paintReport(result) {
  const canvas = newCanvas()
  const ctx = canvas.getContext('2d')
  const pad = 78
  const W = PAGE.w

  ctx.fillStyle = '#F2F7FF'
  ctx.fillRect(0, 0, W, PAGE.h)

  const grad = ctx.createLinearGradient(0, 0, W, 520)
  grad.addColorStop(0, '#2563EB')
  grad.addColorStop(0.55, '#3B82F6')
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
  const headline = result.setName
    ? `${result.setName}`
    : `พาร์ท ${result.partLabel} · ${result.partTitle}`
  ctx.fillText(headline.length > 46 ? `${headline.slice(0, 45)}…` : headline, pad, 306)

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
  ctx.fillText(result.maxPoints ? `เปอร์เซ็นต์` : 'คะแนน (100)', cx, cy + 52)
  ctx.textAlign = 'left'

  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = FONT(400, 24)
  ctx.fillText(`ผู้เข้าสอบ: ${result.name || 'ไม่ระบุชื่อ'}`, pad, 400)
  ctx.fillText(`วันที่ทำแบบทดสอบ: ${result.dateText}`, pad, 436)
  ctx.fillText(
    `ใช้เวลาทำ: ${result.timeUsedText}${result.durationText ? ` จาก ${result.durationText}` : ''}`,
    pad,
    472,
  )

  const stats = [
    { label: 'ตอบถูก', value: `${result.correct}/${result.total}`, color: '#10B981' },
    { label: 'ตอบผิด', value: `${result.wrong}`, color: '#FF6B57' },
    { label: 'ไม่ได้ตอบ', value: `${result.skipped}`, color: '#64748B' },
    {
      label: result.maxPoints ? 'คะแนนรวม' : 'คะแนน',
      value: result.maxPoints ? `${Math.round(result.points)}/${result.maxPoints}` : `${Math.round(result.score)}`,
      color: '#2563EB',
    },
  ]
  const cw = (W - pad * 2 - 3 * 18) / 4
  stats.forEach((s, i) => {
    const x = pad + i * (cw + 18)
    const y = 560
    ctx.fillStyle = '#fff'
    roundRect(ctx, x, y, cw, 148, 26)
    ctx.fill()
    ctx.strokeStyle = 'rgba(11,31,58,0.07)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = s.color
    ctx.font = FONT(700, s.value.length > 7 ? 34 : 42)
    ctx.fillText(String(s.value), x + 24, y + 66)
    ctx.fillStyle = '#64748B'
    ctx.font = FONT(400, 22)
    ctx.fillText(s.label, x + 24, y + 108)
  })

  const passed = result.score >= 60
  ctx.font = FONT(600, 26)
  const badgeText = passed ? 'ผ่านเกณฑ์การประเมิน' : 'ควรทบทวนเพิ่มเติม'
  const tw = ctx.measureText(badgeText).width
  ctx.fillStyle = passed ? '#E8FBF3' : '#FFF1ED'
  roundRect(ctx, pad, 748, tw + 64, 58, 29)
  ctx.fill()
  ctx.fillStyle = passed ? '#067A55' : '#B42318'
  ctx.fillText(badgeText, pad + 32, 786)

  let y = 856
  ctx.fillStyle = '#0B1F3A'
  ctx.font = FONT(600, 32)
  ctx.fillText(result.sections?.length ? 'สรุปผลรายวิชา' : 'สรุปผลรายหัวข้อ', pad, y)
  y += 18

  const rows = (result.sections?.length
    ? result.sections.map((s) => ({ name: s.label, correct: s.correct, total: s.total }))
    : (result.topics || []).map((t) => ({ name: t.name, correct: t.correct, total: t.total }))
  ).slice(0, 9)

  const bx = pad + 420
  const barMax = W - pad - bx - 96
  rows.forEach((t) => {
    y += 46
    const ratio = t.total ? t.correct / t.total : 0
    ctx.fillStyle = '#274060'
    ctx.font = FONT(400, 24)
    const name = t.name.length > 32 ? `${t.name.slice(0, 31)}…` : t.name
    ctx.fillText(name, pad, y + 8)

    ctx.fillStyle = '#DBEAFE'
    roundRect(ctx, bx, y - 8, barMax, 18, 9)
    ctx.fill()

    const g2 = ctx.createLinearGradient(bx, 0, bx + barMax, 0)
    g2.addColorStop(0, '#3B82F6')
    g2.addColorStop(1, '#60A5FA')
    ctx.fillStyle = g2
    if (ratio > 0) {
      roundRect(ctx, bx, y - 8, Math.max(18, barMax * ratio), 18, 9)
      ctx.fill()
    }

    ctx.fillStyle = '#64748B'
    ctx.font = FONT(500, 22)
    ctx.fillText(`${t.correct}/${t.total}`, bx + barMax + 20, y + 8)
  })

  const footY = PAGE.h - 150
  ctx.fillStyle = 'rgba(11,31,58,0.06)'
  ctx.fillRect(pad, footY, W - pad * 2, 2)

  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 21)
  wrapText(
    ctx,
    'รายงานนี้สร้างโดยระบบ BACC Exam 2569 · คลังข้อสอบและเอกสารต้นฉบับทั้งหมดดาวน์โหลดได้จาก Google Drive ของชุดเอกสารเตรียมสอบ ธ.ก.ส. 2569',
    W - pad * 2,
  ).forEach((line, i) => {
    ctx.fillText(line, pad, footY + 48 + i * 32)
  })
  ctx.fillStyle = '#2563EB'
  ctx.font = FONT(600, 21)
  ctx.fillText('drive.google.com/drive/folders/1zcaLIPT0u6estLdIFIm-0PPyF2ACkh7f', pad, footY + 112)

  ctx.fillStyle = 'rgba(11,31,58,0.45)'
  ctx.font = FONT(400, 19)
  ctx.fillText('© 2569 Ton Skywalker · ห้ามเผยแพร่ (All rights reserved)', pad, footY + 158)

  return canvas
}

const waitFonts = async () => {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* ignore */
    }
  }
}

export async function downloadResultPdf(result, filename) {
  await waitFonts()
  const canvas = paintReport(result)
  const blob = buildPdf([canvasToJpeg(canvas)])
  downloadBlob(blob, filename || `BACC-ผลสอบ-${result.partLabel || 'exam'}.pdf`)
}

export function downloadResultImage(result, filename) {
  const canvas = paintReport(result)
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename || `BACC-ผลสอบ-${result.partLabel || 'exam'}.png`)
  }, 'image/png')
}

/* ============================================================
   Export ข้อสอบทั้งชุดเป็น PDF
   ============================================================ */
const LETTERS = ['ก', 'ข', 'ค', 'ง']

function paintCover(exam, meta) {
  const canvas = newCanvas()
  const ctx = canvas.getContext('2d')
  const pad = 78
  const W = PAGE.w

  ctx.fillStyle = '#F2F7FF'
  ctx.fillRect(0, 0, W, PAGE.h)

  const grad = ctx.createLinearGradient(0, 0, W, 760)
  grad.addColorStop(0, '#1E40AF')
  grad.addColorStop(0.5, '#2563EB')
  grad.addColorStop(1, '#A97BFF')
  ctx.fillStyle = grad
  roundRect(ctx, 36, 36, W - 72, 780, 46)
  ctx.fill()

  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(W - 120, 180, 260, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(90, 720, 190, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = FONT(700, 28)
  ctx.fillText('BACC EXAM 2569', pad, 128)

  ctx.fillStyle = '#fff'
  ctx.font = FONT(600, 62)
  ctx.fillText('ข้อสอบเสมือนจริง', pad, 250)
  ctx.font = FONT(500, 40)
  wrapText(ctx, exam.name, W - pad * 2 - 40).forEach((line, i) => {
    ctx.fillText(line, pad, 316 + i * 52)
  })

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = FONT(400, 26)
  ctx.fillText(
    `ผู้เข้าสอบ: ${meta.examinee}`,
    pad,
    470,
  )
  ctx.fillText(`สร้างเมื่อ: ${meta.dateText}`, pad, 512)
  ctx.fillText(`รูปแบบเวลา: ไม่จำกัดเวลา (นับเวลาสะสมตามจริง)`, pad, 554)
  ctx.fillText(`รหัสชุดข้อสอบ: ${exam.seed}`, pad, 596)

  /* structure table */
  ctx.fillStyle = '#0B1F3A'
  ctx.font = FONT(600, 34)
  ctx.fillText('โครงสร้างชุดข้อสอบ', pad, 900)

  let y = 940
  ctx.font = FONT(500, 24)
  ctx.fillStyle = '#64748B'
  ctx.fillText('รายวิชา', pad + 24, y)
  ctx.fillText('จำนวนข้อ', pad + 640, y)
  ctx.fillText('คะแนน', pad + 880, y)
  y += 16
  ctx.strokeStyle = 'rgba(11,31,58,0.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pad, y)
  ctx.lineTo(W - pad, y)
  ctx.stroke()

  exam.sections.forEach((s) => {
    y += 62
    ctx.fillStyle = s.color
    roundRect(ctx, pad, y - 30, 10, 40, 5)
    ctx.fill()
    ctx.fillStyle = '#0B1F3A'
    ctx.font = FONT(400, 26)
    ctx.fillText(s.label, pad + 28, y)
    ctx.font = FONT(500, 26)
    ctx.fillText(`${s.count} ข้อ`, pad + 640, y)
    ctx.fillText(`${s.points} คะแนน`, pad + 880, y)
  })

  y += 78
  ctx.fillStyle = '#F1ECFF'
  roundRect(ctx, pad, y - 44, W - pad * 2, 76, 20)
  ctx.fill()
  ctx.fillStyle = '#1E40AF'
  ctx.font = FONT(600, 26)
  ctx.fillText(`รวม ${exam.totalCount} ข้อ · ${exam.totalPoints} คะแนน`, pad + 28, y + 4)

  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 22)
  ctx.fillText(
    'ข้อสอบชุดนี้สร้างจากระบบ BACC Exam 2569 เพื่อใช้ฝึกซ้อมเท่านั้น',
    pad,
    PAGE.h - 132,
  )
  ctx.fillText('ไม่ใช่ข้อสอบจริงของธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', pad, PAGE.h - 100)

  ctx.fillStyle = 'rgba(11,31,58,0.55)'
  ctx.font = FONT(600, 19)
  ctx.fillText('© 2569 Ton Skywalker · ห้ามเผยแพร่ (All rights reserved)', pad, PAGE.h - 58)

  return canvas
}

function paintQuestionPage(items, meta) {
  const canvas = newCanvas()
  const ctx = canvas.getContext('2d')
  const pad = 70
  const W = PAGE.w
  const contentW = W - pad * 2

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, PAGE.h)

  const head = ctx.createLinearGradient(0, 0, W, 0)
  head.addColorStop(0, '#2563EB')
  head.addColorStop(0.6, '#3B82F6')
  head.addColorStop(1, '#93C5FD')
  ctx.fillStyle = head
  ctx.fillRect(0, 0, W, 10)

  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 20)
  ctx.fillText('BACC EXAM 2569 · ข้อสอบเสมือนจริง', pad, 58)
  ctx.textAlign = 'right'
  ctx.fillText(`หน้า ${meta.pageIndex}/${meta.pageCount}`, W - pad, 58)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#0B1F3A'
  ctx.font = FONT(600, 28)
  ctx.fillText(meta.title, pad, 100)

  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 19)
  ctx.fillText(`${meta.examinee} · ${meta.dateText}`, pad, 130)

  ctx.strokeStyle = 'rgba(11,31,58,0.1)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pad, 150)
  ctx.lineTo(W - pad, 150)
  ctx.stroke()

  let y = 200
  items.forEach((item) => {
    /* section label */
    if (item.sectionHeader) {
      ctx.fillStyle = '#F1ECFF'
      roundRect(ctx, pad, y - 30, contentW, 52, 14)
      ctx.fill()
      ctx.fillStyle = '#1E40AF'
      ctx.font = FONT(600, 24)
      ctx.fillText(item.sectionHeader, pad + 18, y + 4)
      y += 62
      return
    }

    const q = item.q
    const indent = 46

    ctx.fillStyle = '#0B1F3A'
    ctx.font = FONT(600, 23)
    ctx.fillText(`${item.number}.`, pad, y)

    ctx.font = FONT(400, 23)
    const qLines = wrapText(ctx, q.q, contentW - indent)
    qLines.forEach((line, i) => {
      ctx.fillText(line, pad + indent, y + i * 33)
    })
    y += qLines.length * 33 + 8

    /* options in 2 columns */
    const colW = (contentW - indent - 24) / 2
    const rowH = 34
    const optionLines = q.o.map((opt) => wrapText(ctx, opt, colW - 34))
    for (let r = 0; r < 2; r += 1) {
      const rowY = y + r * rowH
      for (let c = 0; c < 2; c += 1) {
        const idx = r * 2 + c
        const x = pad + indent + c * (colW + 24)
        ctx.fillStyle = '#2563EB'
        ctx.font = FONT(600, 21)
        ctx.fillText(`${LETTERS[idx]}.`, x, rowY)
        ctx.fillStyle = '#274060'
        ctx.font = FONT(400, 21)
        const first = optionLines[idx][0] || ''
        ctx.fillText(first, x + 26, rowY)
      }
      const extra = Math.max(
        optionLines[r * 2].length - 1,
        optionLines[r * 2 + 1] ? optionLines[r * 2 + 1].length - 1 : 0,
      )
      if (extra > 0) {
        for (let e = 1; e <= extra; e += 1) {
          for (let c = 0; c < 2; c += 1) {
            const idx = r * 2 + c
            if (optionLines[idx][e]) {
              const x = pad + indent + c * (colW + 24)
              ctx.fillStyle = '#274060'
              ctx.font = FONT(400, 21)
              ctx.fillText(optionLines[idx][e], x + 26, rowY + e * 24)
            }
          }
        }
      }
    }
    const maxOptLines = Math.max(...optionLines.map((l) => l.length))
    y += 2 * rowH + (maxOptLines - 1) * 24 + 26

    ctx.strokeStyle = 'rgba(11,31,58,0.05)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad, y - 14)
    ctx.lineTo(W - pad, y - 14)
    ctx.stroke()
  })

  /* footer */
  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 18)
  ctx.fillText('BACC Exam 2569 · ชุดข้อสอบเสมือนจริง · © Ton Skywalker (ห้ามเผยแพร่)', pad, PAGE.h - 46)
  ctx.textAlign = 'right'
  ctx.fillText(`หน้า ${meta.pageIndex}/${meta.pageCount}`, W - pad, PAGE.h - 46)
  ctx.textAlign = 'left'

  return canvas
}

function paintAnswerKey(items, meta) {
  const canvas = newCanvas()
  const ctx = canvas.getContext('2d')
  const pad = 70
  const W = PAGE.w

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, PAGE.h)

  const head = ctx.createLinearGradient(0, 0, W, 0)
  head.addColorStop(0, '#10B981')
  head.addColorStop(1, '#5EEAD4')
  ctx.fillStyle = head
  ctx.fillRect(0, 0, W, 10)

  ctx.fillStyle = '#0B1F3A'
  ctx.font = FONT(600, 36)
  ctx.fillText('เฉลยคำตอบ', pad, 100)
  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 20)
  ctx.fillText(`${meta.title} · ${meta.examinee}`, pad, 140)

  const cols = 6
  const colW = (W - pad * 2) / cols
  const rowH = 46
  let row = 0
  items.forEach((item, i) => {
    const c = i % cols
    if (c === 0 && i > 0) row += 1
    const x = pad + c * colW
    const y = 210 + row * rowH
    if (y > PAGE.h - 90) return
    ctx.fillStyle = '#64748B'
    ctx.font = FONT(400, 22)
    ctx.fillText(`${item.number}.`, x, y)
    ctx.fillStyle = '#067A55'
    ctx.font = FONT(600, 22)
    ctx.fillText(LETTERS[item.q.a], x + 52, y)
  })

  ctx.fillStyle = 'rgba(11,31,58,0.45)'
  ctx.font = FONT(400, 17)
  ctx.fillText('© 2569 Ton Skywalker · ห้ามเผยแพร่', pad, PAGE.h - 46)

  return canvas
}

/* ---------- paginate ---------- */
function paginate(exam, meta) {
  const canvas = newCanvas()
  const ctx = canvas.getContext('2d')
  const pad = 70
  const contentW = PAGE.w - pad * 2
  const usableTop = 200
  const usableBottom = PAGE.h - 90

  const blocks = []
  let number = 0
  exam.sections.forEach((section) => {
    blocks.push({ sectionHeader: `วิชา${section.label} · ${section.count} ข้อ (${section.points} คะแนน)` })
    section.questions.forEach((q) => {
      number += 1
      ctx.font = FONT(400, 23)
      const qLines = wrapText(ctx, q.q, contentW - 46)
      const colW = (contentW - 46 - 24) / 2
      ctx.font = FONT(400, 21)
      const optionLines = q.o.map((opt) => wrapText(ctx, opt, colW - 34))
      const maxOptLines = Math.max(...optionLines.map((l) => l.length))
      const height = qLines.length * 33 + 8 + 2 * 34 + (maxOptLines - 1) * 24 + 26
      blocks.push({ q, number, height })
    })
  })

  const pages = []
  let current = []
  let used = 0
  const limit = usableBottom - usableTop
  blocks.forEach((block) => {
    const h = block.sectionHeader ? 62 : block.height
    if (used + h > limit && current.length) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(block)
    used += h
  })
  if (current.length) pages.push(current)
  return pages
}

export async function exportExamPdf(exam, options = {}) {
  await waitFonts()
  const { examinee = 'ผู้เข้าสอบ', includeAnswers = true, onProgress } = options
  const meta = {
    examinee,
    title: exam.name,
    dateText: new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }

  const pages = paginate(exam, meta)

  const answers = []
  if (includeAnswers) {
    let n = 0
    exam.sections.forEach((s) =>
      s.questions.forEach((q) => {
        n += 1
        answers.push({ number: n, q })
      }),
    )
  }
  const perPage = 31
  const answerChunks = []
  for (let i = 0; i < answers.length; i += perPage) answerChunks.push(answers.slice(i, i + perPage))

  const totalPages = 1 + pages.length + answerChunks.length
  const images = []

  images.push(canvasToJpeg(paintCover(exam, meta), 0.92))
  onProgress?.(1, totalPages)

  for (let i = 0; i < pages.length; i += 1) {
    await new Promise((r) => setTimeout(r, 0))
    images.push(
      canvasToJpeg(
        paintQuestionPage(pages[i], { ...meta, pageIndex: i + 2, pageCount: totalPages }),
        0.92,
      ),
    )
    onProgress?.(i + 2, totalPages)
  }

  for (let i = 0; i < answerChunks.length; i += 1) {
    await new Promise((r) => setTimeout(r, 0))
    images.push(
      canvasToJpeg(
        paintAnswerKey(answerChunks[i], {
          ...meta,
          pageIndex: pages.length + 2 + i,
          pageCount: totalPages,
        }),
        0.92,
      ),
    )
    onProgress?.(pages.length + 2 + i, totalPages)
  }

  const blob = buildPdf(images)
  downloadBlob(blob, options.filename || `BACC-ข้อสอบ-${exam.name.replace(/\s+/g, '-')}.pdf`)
  return blob
}

/* ============================================================
   เกียรติบัตร (แนวนอน A4 landscape) — canvas → PDF/PNG
   ============================================================ */
const CERT = { w: 1754, h: 1240 } // A4 landscape ~150dpi
const A4L = { w: 841.89, h: 595.28 }

function paintCertificate(cert) {
  const canvas = document.createElement('canvas')
  canvas.width = CERT.w
  canvas.height = CERT.h
  const ctx = canvas.getContext('2d')
  const W = CERT.w
  const H = CERT.h
  const color = cert.partColor || '#2563EB'
  const tier = {
    gold: { c1: '#F59E0B', c2: '#FDE68A', ink: '#92400E' },
    silver: { c1: '#94A3B8', c2: '#F1F5F9', ink: '#334155' },
    bronze: { c1: '#D08A4E', c2: '#FBD9B8', ink: '#7C2D12' },
  }[cert.key] || { c1: '#F59E0B', c2: '#FDE68A', ink: '#92400E' }

  /* พื้นหลัง */
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#FFFDF6')
  bg.addColorStop(1, '#F4EDFF')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  /* มุมสีพาสเทล */
  ctx.globalAlpha = 0.5
  ctx.fillStyle = tier.c2
  ctx.beginPath()
  ctx.arc(-120, -120, 380, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(96,165,250,0.35)'
  ctx.beginPath()
  ctx.arc(W + 100, H + 80, 420, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  /* กรอบคู่ */
  ctx.strokeStyle = tier.c1
  ctx.lineWidth = 10
  roundRect(ctx, 34, 34, W - 68, H - 68, 40)
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.setLineDash([14, 12])
  roundRect(ctx, 62, 62, W - 124, H - 124, 28)
  ctx.stroke()
  ctx.setLineDash([])

  /* ดาว/ประกาย */
  ctx.fillStyle = tier.c1
  const stars = [
    [130, 200, 16], [W - 140, 190, 20], [180, H - 180, 14],
    [W - 180, H - 200, 15], [W / 2 - 330, 150, 10], [W / 2 + 340, H - 150, 12],
  ]
  stars.forEach(([sx, sy, r]) => {
    ctx.font = `700 ${r * 2}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('✦', sx, sy)
  })
  ctx.textAlign = 'left'

  /* เหรียญ + ริบบิ้น */
  const mx = W / 2
  const my = 218
  ctx.fillStyle = tier.c1
  ctx.beginPath()
  ctx.arc(mx, my, 96, 0, Math.PI * 2)
  ctx.fill()
  const mg = ctx.createRadialGradient(mx - 24, my - 30, 10, mx, my, 96)
  mg.addColorStop(0, '#FFFFFF')
  mg.addColorStop(0.35, tier.c2)
  mg.addColorStop(1, tier.c1)
  ctx.fillStyle = mg
  ctx.beginPath()
  ctx.arc(mx, my, 82, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = tier.ink
  ctx.font = FONT(700, 74)
  ctx.textAlign = 'center'
  ctx.fillText('★', mx, my + 26)

  /* หัวเรื่อง */
  ctx.fillStyle = '#0B1F3A'
  ctx.font = FONT(700, 92)
  ctx.fillText('เกียรติบัตร', W / 2, 440)
  ctx.fillStyle = color
  ctx.font = FONT(700, 34)
  ctx.fillText('CERTIFICATE OF ACHIEVEMENT · BACC EXAM 2569', W / 2, 498)

  ctx.fillStyle = '#475569'
  ctx.font = FONT(400, 36)
  ctx.fillText('ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า', W / 2, 590)

  /* ชื่อ */
  ctx.fillStyle = tier.ink
  ctx.font = FONT(700, 78)
  ctx.fillText(cert.name || 'ผู้เข้าทดสอบ', W / 2, 690)
  /* เส้นใต้ชื่อ */
  ctx.strokeStyle = tier.c1
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(W / 2 - 340, 716)
  ctx.lineTo(W / 2 + 340, 716)
  ctx.stroke()

  ctx.fillStyle = '#475569'
  ctx.font = FONT(400, 36)
  ctx.fillText('ได้สอบผ่านการทดสอบภาควิชาการ (ตามเกณฑ์ 60%) ใน', W / 2, 792)

  /* ชื่อพาร์ท */
  ctx.fillStyle = '#0B1F3A'
  ctx.font = FONT(700, 58)
  const partLine = `พาร์ท ${cert.partLabel} · ${cert.partTitle}`
  ctx.fillText(partLine.length > 34 ? `${partLine.slice(0, 33)}…` : partLine, W / 2, 870)

  /* คะแนน + ระดับ */
  ctx.font = FONT(700, 40)
  ctx.fillStyle = tier.c1
  ctx.fillText(`${cert.medal} ผลคะแนน ${Math.round(cert.score)}% · ${cert.label}`, W / 2, 952)

  /* ลายเซ็น + วันที่ */
  ctx.fillStyle = '#64748B'
  ctx.font = FONT(400, 28)
  ctx.fillText(`ออกให้เมื่อ ${cert.dateText || ''}`, W / 2, H - 150)
  ctx.font = FONT(600, 28)
  ctx.fillStyle = color
  ctx.fillText('Ton Skywalker · ผู้จัดทำแบบทดสอบ', W / 2, H - 106)

  ctx.fillStyle = '#94A3B8'
  ctx.font = FONT(400, 22)
  ctx.fillText('เกียรติบัตรฉบับนี้ออกโดยระบบ BACC Exam 2569 เพื่อเป็นกำลังใจในการฝึกซ้อม', W / 2, H - 52)
  ctx.textAlign = 'left'
  return canvas
}

export async function downloadCertificatePdf(cert, filename) {
  await waitFonts()
  const canvas = paintCertificate(cert)
  const jpg = canvasToJpeg(canvas, 0.92)
  const blob = buildPdf([{ ...jpg, pw: A4L.w, ph: A4L.h }])
  downloadBlob(blob, filename || `BACC-เกียรติบัตร-${cert.partLabel || 'part'}.pdf`)
}

export async function downloadCertificateImage(cert, filename) {
  await waitFonts()
  const canvas = paintCertificate(cert)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename || `BACC-เกียรติบัตร-${cert.partLabel || 'part'}.png`)
      resolve()
    }, 'image/png')
  })
}
