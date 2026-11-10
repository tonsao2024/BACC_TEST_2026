import { dom, getLastBlob } from './env.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import App from '../src/App.jsx'
import { PARTS, MOCK_PART, TOTAL_QUESTIONS } from '../src/data/index.js'

const root = createRoot(document.getElementById('root'))
const text = () => document.body.textContent || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function byText(selector, needle) {
  return Array.from(document.querySelectorAll(selector)).find((el) => (el.textContent || '').includes(needle))
}

const results = []
const check = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond, extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
}

async function run() {
  /* ---------- data integrity ---------- */
  let invalid = []
  PARTS.forEach((p) => {
    p.questions.forEach((q, i) => {
      if (!Array.isArray(q.o) || q.o.length !== 4) invalid.push(`${p.id}#${i + 1} options`)
      if (typeof q.a !== 'number' || q.a < 0 || q.a > 3) invalid.push(`${p.id}#${i + 1} answer`)
      if (!q.e || q.e.length < 10) invalid.push(`${p.id}#${i + 1} explanation`)
      if (!q.t) invalid.push(`${p.id}#${i + 1} topic`)
      if (q.ofigs && q.ofigs.length !== 4) invalid.push(`${p.id}#${i + 1} option figures`)
    })
  })
  check(`question bank valid (${TOTAL_QUESTIONS} items)`, invalid.length === 0, invalid.slice(0, 5).join(', '))
  check('mock exam composed', MOCK_PART.questions.length === 30, `${MOCK_PART.questions.length} items`)

  /* ---------- home ---------- */
  await act(async () => {
    root.render(<App />)
  })
  await act(async () => {
    await sleep(30)
  })
  check('home renders hero', text().includes('พร้อมสอบ'))
  check('home lists 11 parts', document.querySelectorAll('.part-card').length >= 12)
  check('bottom nav rendered', document.querySelectorAll('.nav-item').length === 4)

  /* open first part */
  const firstCard = document.querySelector('.part-list .part-card')
  await act(async () => {
    firstCard.click()
  })
  check('part detail opens', text().includes('คำชี้แจงก่อนเริ่มทำข้อสอบ'))
  check('drive download link present', !!document.querySelector('a[href*="uc?export=download"]'))

  /* start quiz */
  const startBtn = byText('button', 'เริ่มทำข้อสอบ')
  await act(async () => {
    startBtn.click()
  })
  await act(async () => {
    await sleep(20)
  })
  check('quiz screen opens', text().includes('ข้อที่ 1'))
  check('timer running', /\d\d:\d\d/.test(text()))

  /* answer first option on every question, then submit */
  const totalQ = PARTS[0].questions.length
  for (let i = 0; i < totalQ; i += 1) {
    const opts = document.querySelectorAll('.option')
    if (opts.length !== 4) {
      check(`question ${i + 1} has 4 options`, false)
      break
    }
    await act(async () => {
      opts[i % 4].click()
    })
    const next = byText('button', 'ข้อถัดไป') || byText('button', 'ส่งคำตอบ')
    await act(async () => {
      next.click()
    })
  }

  const submitBtn = byText('.quiz-foot button', 'ส่งคำตอบ')
  await act(async () => {
    submitBtn.click()
  })
  const confirmBtn = byText('.sheet button', 'ส่งคำตอบ')
  await act(async () => {
    confirmBtn.click()
  })
  await act(async () => {
    await sleep(60)
  })

  check('result screen shows score', text().includes('คะแนนจาก 100'))
  check('review list rendered', document.querySelectorAll('.review-item').length === totalQ)
  check('result saved to storage', JSON.parse(localStorage.getItem('bacc-exam-2569/results/v1') || '[]').length === 1)

  /* expand a review item */
  await act(async () => {
    document.querySelector('.review-head').click()
  })
  check('explanation visible', document.querySelector('.explain')?.textContent.includes('เฉลย'))

  /* ---------- PDF download ---------- */
  const pdfBtn = byText('.download-row', 'ดาวน์โหลดผลการทดสอบ (PDF)')
  await act(async () => {
    try {
      pdfBtn.click()
    } catch (e) {
      console.log('PDF click error:', e.message)

    }
    await sleep(120)
  })
  const blob = getLastBlob()
  check('pdf blob created', blob && blob.type === 'application/pdf')

  if (blob) {
    const buf = Buffer.from(await blob.arrayBuffer())
    const head = buf.subarray(0, 8).toString('latin1')
    check('pdf header valid', head.startsWith('%PDF-1.4'), head)
    const tail = buf.subarray(-40).toString('latin1')
    check('pdf has EOF marker', tail.includes('%%EOF'))

    const startxref = Number(
      (buf.toString('latin1').match(/startxref\s+(\d+)/) || [])[1],
    )
    check('startxref points at xref table', buf.subarray(startxref, startxref + 4).toString('latin1') === 'xref')

    const xref = buf.subarray(startxref).toString('latin1')
    const offsets = [...xref.matchAll(/^(\d{10}) 00000 n/gm)].map((m) => Number(m[1]))
    const objectsOk = offsets.every((off, i) => {
      const snippet = buf.subarray(off, off + 12).toString('latin1')
      return snippet.startsWith(`${i + 1} 0 obj`)
    })
    check('pdf xref offsets correct', offsets.length === 5 && objectsOk, `${offsets.length} entries`)
    check('pdf embeds JPEG stream', buf.toString('latin1').includes('/DCTDecode'))
  }

  /* ---------- history ---------- */
  await act(async () => {
    byText('.btn', 'ผลสอบทั้งหมด').click()
  })
  check('history lists result', document.querySelectorAll('.hist-card').length === 1)

  /* back home via nav */
  await act(async () => {
    byText('.nav-item', 'หน้าแรก').click()
  })
  check('returns home', text().includes('คะแนนเฉลี่ย'))

  /* sources page */
  await act(async () => {
    byText('.nav-item', 'เอกสาร').click()
  })
  check('sources page lists 16 files', document.querySelectorAll('.source-item').length === 16)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) {
    console.log('FAILED:', failed.map((f) => f.name).join(' | '))
    process.exit(1)
  }
  process.exit(0)
}

run().catch((err) => {
  console.error('SMOKE ERROR:', err)
  process.exitCode = 1
})
