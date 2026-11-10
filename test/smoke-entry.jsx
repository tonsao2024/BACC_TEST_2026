import { dom, fetchCalls, getLastBlob, setRemotePayload } from './env.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import App from '../src/App.jsx'
import { PARTS, MOCK_PART, TOTAL_QUESTIONS } from '../src/data/index.js'
import { certTier, certificatesFromResults } from '../src/lib/certs.js'
import { generateExam } from '../src/lib/generator.js'
import { parseQuestionText } from '../src/lib/importer.js'
import { exportExamPdf } from '../src/lib/pdf.js'
import { clearGithubConfig, saveGithubConfig } from '../src/lib/remote.js'
import { pullAndMerge, resetSyncState } from '../src/lib/sync.js'
import {
  clearImportedQuestions,
  exportSnapshot,
  getProfiles,
  importedQuestions,
  saveImportedQuestions,
  getSettings,
  listAttempts,
  makeShareCode,
  mergeSnapshots,
  parseShareCode,
  saveSettings,
} from '../src/lib/storage.js'

const root = createRoot(document.getElementById('root'))
const text = () => document.body.textContent || ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function byText(selector, needle) {
  return Array.from(document.querySelectorAll(selector)).find((el) => (el.textContent || '').includes(needle))
}

const type = (input, value) => {
  const proto =
    input.tagName === 'TEXTAREA'
      ? dom.window.HTMLTextAreaElement.prototype
      : dom.window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
}

const results = []
const check = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond, extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
}
const tap = async (el, wait = 20) => {
  if (!el) return
  await act(async () => {
    el.click()
    await sleep(wait)
  })
}

const json = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

async function run() {
  /* ================= 1. data & generator ================= */
  let invalid = []
  PARTS.forEach((p) => {
    p.questions.forEach((q, i) => {
      if (!Array.isArray(q.o) || q.o.length !== 4) invalid.push(`${p.id}#${i + 1} options`)
      if (typeof q.a !== 'number' || q.a < 0 || q.a > 3) invalid.push(`${p.id}#${i + 1} answer`)
      if (!q.e || q.e.length < 10) invalid.push(`${p.id}#${i + 1} explanation`)
      if (new Set(q.o.map(String)).size !== 4) invalid.push(`${p.id}#${i + 1} duplicate options`)
    })
  })
  check(`question bank valid (${TOTAL_QUESTIONS} items)`, invalid.length === 0, invalid.slice(0, 4).join(', '))
  check('mock exam composed', MOCK_PART.questions.length === 30, `${MOCK_PART.questions.length} items`)

  /* certificates */
  const mkRes = (partId, score, date) => ({ id: `${partId}-${score}`, kind: 'part', partId, score, date, correct: score, total: 100 })
  const certList = certificatesFromResults([
    mkRes('1-1', 45, '2026-01-01'),
    mkRes('1-1', 73, '2026-01-02'),
    mkRes('1-2', 88, '2026-01-03'),
    mkRes('1-2', 61, '2026-01-01'),
    { ...mkRes('set-x', 90, '2026-01-04'), kind: 'set' },
  ])
  check(
    'certificates: only passing parts, best score kept',
    certList.length === 2 && certList.find((c) => c.partId === '1-2')?.score === 88,
    `${certList.length} certs`,
  )
  check(
    'certificates: pass threshold at 60%',
    certificatesFromResults([mkRes('2', 59.9, '2026-01-01')]).length === 0 &&
      certificatesFromResults([mkRes('2', 60, '2026-01-01')]).length === 1,
  )
  check(
    'cert tiers gold/silver/bronze',
    certTier(90).key === 'gold' && certTier(76).key === 'silver' && certTier(60).key === 'bronze',
  )

  const official = generateExam({ seed: 'smoke-seed', sizeKey: 'official', name: 'ชุดทดสอบ' })
  check(
    'official set = 230 ข้อ / 250 คะแนน',
    official.totalCount === 230 && official.totalPoints === 250,
    `${official.totalCount}/${official.totalPoints}`,
  )
  check(
    'official blueprint 80/50/100',
    official.sections.map((s) => `${s.count}:${s.points}`).join('|') === '80:100|50:50|100:100',
    official.sections.map((s) => `${s.count}:${s.points}`).join('|'),
  )
  check('official set has no repeated items', official.repeats === 0, `${official.repeats} repeats`)
  check(
    'official set options valid',
    official.questions.every((q) => q.o.length === 4 && new Set(q.o.map(String)).size === 4),
  )

  const officialAgain = generateExam({ seed: 'smoke-seed', sizeKey: 'official', name: 'ชุดทดสอบ' })
  check(
    'same seed reproduces identical set',
    officialAgain.questions.every((q, i) => q.q === official.questions[i].q && q.a === official.questions[i].a),
  )
  const other = generateExam({ seed: 'another-seed', sizeKey: 'official', name: 'ชุดทดสอบ' })
  check('different seed produces different set', other.questions[0].q !== official.questions[0].q)
  const mini = generateExam({ seed: 'smoke-seed', sizeKey: 'mini', name: 'ชุดย่อ' })
  check('mini set = 60 ข้อ / 65 คะแนน', mini.totalCount === 60 && mini.totalPoints === 65, `${mini.totalCount}/${mini.totalPoints}`)

  const code = makeShareCode({ seed: 'abc', name: 'ชุดของเพื่อน', sizeKey: 'mini' })
  const parsed = parseShareCode(code)
  check(
    'share code round-trip',
    parsed && parsed.seed === 'abc' && parsed.sizeKey === 'mini' && parsed.name === 'ชุดของเพื่อน',
    code.slice(0, 22),
  )
  check('invalid share code rejected', parseShareCode('not-a-code!!') === null)

  /* snapshot merge (GitHub sync core) */
  const merged = mergeSnapshots(
    { profiles: [{ id: 'a', name: 'A', updatedAt: '2026-01-02T00:00:00.000Z' }] },
    {
      profiles: [
        { id: 'a', name: 'A เก่า', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'b', name: 'B', updatedAt: '2026-01-01T00:00:00.000Z' },
      ],
    },
  )
  check(
    'snapshot merge unions profiles (newest wins)',
    merged.profiles.length === 2 && merged.profiles.find((p) => p.id === 'a').name === 'A',
    `${merged.profiles.length} profiles`,
  )
  check('settings default = instant reveal on', getSettings().instantReveal === true)
  check('settings persist', saveSettings({ sound: true }).sound === true && getSettings().sound === true)
  saveSettings({ sound: false })

  /* importer: parse the real DOCX text format */
  const SAMPLE_BANK = `ข้อ 1. จงหาจำนวนถัดไปของอนุกรม  3  6  11  18  27  ?
คณิตศาสตร์ › อนุกรมและลำดับ
1)  36
2)  37
3)  38
4)  39

ข้อ 2. ถ้าซื้อสินค้าราคา 250 บาท ลด 20% ต้องจ่ายกี่บาท
คณิตศาสตร์ › ดอกเบี้ยและการเงิน
1)  180
2)  200
3)  210
4)  220

เฉลย
1. 2 — อนุกรมเพิ่มขึ้นทีละ 3, 5, 7, 9 ดังนั้นถัดไป 36
2. 2`
  const parsedBank = parseQuestionText(SAMPLE_BANK)
  check(
    'importer parses DOCX-style questions',
    parsedBank.questions.length === 2 && parsedBank.questions[0].o[1] === '37',
    `${parsedBank.questions.length} ข้อ`,
  )
  check(
    'importer maps answer key + explanation',
    parsedBank.questions[0].a === 1 && parsedBank.questions[0].e.includes('อนุกรม'),
    `a=${parsedBank.questions[0].a}`,
  )
  const savedImport = saveImportedQuestions('part11', parsedBank.questions)
  check('imported questions stored per part', savedImport.added === 2 && importedQuestions('part11').length === 2)
  const dupe = saveImportedQuestions('part11', parsedBank.questions)
  check('importer skips duplicates', dupe.added === 0 && dupe.total === 2)
  clearImportedQuestions('part11')
  check('imported bank can be cleared', importedQuestions('part11').length === 0)

  /* ================= 2. profile gate ================= */
  await act(async () => {
    root.render(<App />)
  })
  await act(async () => {
    await sleep(40)
  })
  check('profile gate shown on first visit', !!document.querySelector('.gate__card'))

  /* ถ้ามีช่องเลือกชื่อสำเร็จรูป (roster.js) ให้เปิดโหมดพิมพ์ชื่อใหม่ก่อน */
  if (!document.querySelector('.gate__card input')) {
    await tap(byText('.gate__card button', 'ใช้ชื่อใหม่'), 60)
  }
  check('gate asks for name', text().includes('ชื่อ–นามสกุลผู้เข้าทดสอบ'))

  const nameInput = document.querySelector('.gate__card input')
  await act(async () => {
    type(nameInput, 'สมชาย ใจดี')
    await sleep(20)
  })
  await tap(byText('.gate__card button', 'เริ่มใช้งาน'), 60)

  check('enters app after name saved', !document.querySelector('.gate__card') && text().includes('สมชาย ใจดี'))
  const profiles = json('bacc2569:profiles', [])
  check('profile persisted', profiles.length === 1 && profiles[0].name === 'สมชาย ใจดี')

  /* ================= 3. home ================= */
  check('home hero renders', text().includes('พร้อมสอบ'))
  check('home lists all parts', document.querySelectorAll('.part-card').length >= 12)
  check('bottom nav has 5 items', document.querySelectorAll('.nav-item').length === 5)
  check('exam-set hero rendered', !!document.querySelector('.set-hero'))
  check('hero mascot rendered', document.querySelectorAll('.hero__mascot svg, svg.hero__mascot').length >= 1)
  check(
    'part cards carry animated mascots',
    document.querySelectorAll('.part-mascot .mascot').length >= 11 &&
      document.querySelectorAll('svg.mascot').length >= 12,
    `${document.querySelectorAll('svg.mascot').length} mascots`,
  )
  check('friend leaderboard rendered', !!document.querySelector('.friend-board'))
  check(
    'leaderboard lists testers',
    document.querySelectorAll('.board__row').length >= 1,
    `${document.querySelectorAll('.board__row').length} rows`,
  )
  check(
    'copyright credit shown',
    (document.querySelector('.copyright')?.textContent || '').includes('Ton Skywalker') &&
      (document.querySelector('.copyright')?.textContent || '').includes('ห้ามเผยแพร่'),
  )

  /* quick account switch from home */
  check('hero offers account switch', !!document.querySelector('.hero__switch'))
  await tap(document.querySelector('.hero__switch'), 50)
  check('quick switch opens account sheet', !!document.querySelector('.acct'))
  await tap(document.querySelector('.acct__head-actions .btn'), 40)
  check(
    'account sheet jumps to switcher',
    Array.from(document.querySelectorAll('.seg__item')).some(
      (el) => el.getAttribute('aria-selected') === 'true' && (el.textContent || '').includes('สลับผู้ใช้'),
    ),
  )
  await tap(document.querySelector('.sheet-backdrop'), 40)
  check('account sheet closed', !document.querySelector('.acct'))

  /* toggle dark mode */
  await tap(document.querySelector('.topbar__theme'), 30)
  check('dark mode applied', document.documentElement.getAttribute('data-theme') === 'dark')
  check('theme saved', localStorage.getItem('bacc2569:theme') === 'dark')
  await tap(document.querySelector('.topbar__theme'), 30)
  check('light mode restored', document.documentElement.getAttribute('data-theme') === 'light')

  /* ================= 4. part detail + resumable quiz ================= */
  await tap(document.querySelector('.part-list .part-card'), 40)
  check('part detail opens', text().includes('คำชี้แจงก่อนเริ่มทำข้อสอบ'))
  check('in-app reader button present', !!byText('.download-row', 'อ่านเอกสารในเว็บไซต์'))
  check('drive download link present', !!document.querySelector('a[href*="uc?export=download"]'))

  await tap(byText('.quiz-foot button', 'เริ่มทำข้อสอบ'), 40)
  check('quiz screen opens', text().includes('ข้อที่ 1'))
  check('timer running', /\d\d:\d\d/.test(text()))

  await tap(document.querySelector('.quiz-foot .btn--icon[aria-label="รายการข้อสอบ"]'), 50)
  check('instant-reveal toggle available in quiz', !!document.querySelector('.toggle-row .switch'))
  await tap(document.querySelector('.toggle-row .switch'), 40)
  check('instant reveal can be turned off', getSettings().instantReveal === false)
  await tap(document.querySelector('.toggle-row .switch'), 40)
  check('instant reveal turned back on', getSettings().instantReveal === true)
  await tap(document.querySelector('.sheet-backdrop'), 50)
  check('palette sheet closed', !document.querySelector('.sheet'))

  const partTotal = PARTS[0].questions.length
  /* instant reveal + detailed explanation */
  await tap(document.querySelectorAll('.option')[0], 40)
  const fb = document.querySelector('.feedback')
  check('choose answer reveals result instantly', !!fb)
  check(
    'feedback shows correct / wrong state',
    !!document.querySelector('.feedback.is-ok, .feedback.is-bad') &&
      !!document.querySelector('.option.is-correct'),
  )
  check(
    'feedback includes detailed explanation',
    (fb?.textContent || '').includes('คำอธิบายละเอียด') && (fb?.textContent || '').includes('เฉลย'),
    (fb?.textContent || '').slice(0, 0),
  )
  check('quiz has desktop overview aside', !!document.querySelector('.quiz-aside .palette-grid'))
  const beforeLock = Array.from(document.querySelectorAll('.option'))
    .map((o) => o.className)
    .join('|')
  await tap(document.querySelectorAll('.option')[2], 30)
  const afterLock = Array.from(document.querySelectorAll('.option'))
    .map((o) => o.className)
    .join('|')
  check('answer locked after reveal', beforeLock === afterLock)

  for (let i = 0; i < 3; i += 1) {
    await tap(document.querySelectorAll('.option')[0], 15)
    await tap(byText('.quiz-foot button', 'ข้อถัดไป'), 15)
  }
  check('answers registered', text().includes('ตอบแล้ว'))

  /* pause & leave */
  await tap(document.querySelector('.topbar .icon-btn[aria-label="หยุดพัก"]'), 30)
  await tap(byText('.sheet button', 'พักไว้ก่อน'), 40)
  check('paused overlay shown', !!document.querySelector('.paused-card'))

  await tap(byText('.paused-card button', 'กลับหน้าหลัก'), 60)
  check('returns to part detail with resume button', !!byText('.quiz-foot button', 'ทำต่อ'))

  const pid = json('bacc2569:profiles', [])[0].id
  const attempts = listAttempts(pid)
  check('attempt persisted', attempts.length === 1, `${attempts.length} attempt(s)`)
  check('attempt stores answers', (attempts[0]?.answers || []).filter((a) => a !== null).length === 3)
  check('attempt stores elapsed seconds', (attempts[0]?.usedSec || 0) >= 0)

  /* resume and finish */
  await tap(byText('.quiz-foot button', 'ทำต่อ'), 40)
  check('resumed at saved question', text().includes('ข้อที่ 4') || text().includes('ข้อ 4'))

  for (let i = 3; i < partTotal; i += 1) {
    await tap(document.querySelectorAll('.option')[i % 4], 8)
    await tap(byText('.quiz-foot button', 'ข้อถัดไป') || byText('.quiz-foot button', 'ส่งคำตอบ'), 8)
  }
  await tap(byText('.quiz-foot button', 'ส่งคำตอบ'), 20)
  await tap(byText('.sheet button', 'ส่งคำตอบ'), 80)

  check('result screen shows score', text().includes('คะแนนจาก 100'))
  check('review list rendered', document.querySelectorAll('.review-item').length === partTotal)
  check('attempt cleared after submit', listAttempts(pid).length === 0)
  check('result saved under profile', json(`bacc2569:results:${pid}`, []).length === 1)

  await tap(document.querySelector('.review-head'), 20)
  check('explanation visible', (document.querySelector('.explain')?.textContent || '').includes('เฉลย'))

  /* PDF report */
  await act(async () => {
    byText('.download-row', 'ดาวน์โหลดผลการทดสอบ (PDF)').click()
    await sleep(200)
  })
  const reportBlob = getLastBlob()
  check('result pdf created', reportBlob && reportBlob.type === 'application/pdf')

  /* ================= 5. exam builder ================= */
  await tap(byText('.btn', 'กลับหน้าแรก'), 60)
  await tap(byText('.nav-item', 'ชุดสอบ'), 60)
  check('builder screen opens', text().includes('สร้างชุดข้อสอบนี้'))
  check('blueprint preview lists 3 sections', document.querySelectorAll('.struct-row').length === 3)

  /* choose mini size for a fast run */
  await tap(byText('.size-card', 'ชุดย่อ'), 60)
  await tap(byText('.btn', 'สร้างชุดข้อสอบนี้'), 120)
  check('creation sheet shown', text().includes('สร้างชุดข้อสอบสำเร็จ'))
  check(
    'set storage location explained (page + sheet)',
    document.querySelectorAll('.store-note').length >= 2 &&
      (document.querySelector('.store-note')?.textContent || '').includes('bacc2569:sets'),
  )
  check('share code shown', !!document.querySelector('.share-box code'))

  const sets = json('bacc2569:sets', [])
  check('set persisted', sets.length === 1 && sets[0].seed)
  check(
    'localStorage sets key holds the created set',
    json('bacc2569:sets', []).length === 1 && !!json('bacc2569:sets', [])[0].seed,
  )
  check('set owner recorded', sets[0]?.owner === 'สมชาย ใจดี', sets[0]?.owner)

  /* importer UI */
  const importArea = document.querySelector('.import-area')
  check('exam builder offers question importer', !!importArea)
  await act(async () => {
    type(importArea, SAMPLE_BANK)
    await sleep(30)
  })
  await tap(byText('.import-actions button', 'ตรวจสอบข้อความ'), 60)
  check('import preview shows parsed items', document.querySelectorAll('.import-preview__row').length >= 2)
  check(
    'import preview counts questions',
    (document.querySelector('.import-count')?.textContent || '').includes('พบ 2 ข้อ'),
    (document.querySelector('.import-count')?.textContent || '').slice(0, 30),
  )

  /* exam pdf export (direct, full set) */
  await act(async () => {
    await exportExamPdf(mini, { examinee: 'สมชาย ใจดี', includeAnswers: true })
    await sleep(300)
  })
  const examBlob = getLastBlob()
  check('exam pdf created', examBlob && examBlob.type === 'application/pdf')
  if (examBlob) {
    const buf = Buffer.from(await examBlob.arrayBuffer())
    const latin = buf.toString('latin1')
    const pageCount = Number((latin.match(/\/Count (\d+)/) || [])[1] || 0)
    check('exam pdf is multi-page', pageCount >= 5, `${pageCount} pages`)
    check('exam pdf header/trailer', latin.startsWith('%PDF-1.4') && latin.trimEnd().endsWith('%%EOF'))
    check('exam pdf contains images', (latin.match(/DCTDecode/g) || []).length === pageCount)
  }

  /* start the set exam */
  await tap(byText('.sheet button', 'เริ่มสอบเลย'), 120)
  check('set exam starts', text().includes('ชุดสอบเสมือนจริง'))
  check('section chips rendered', document.querySelectorAll('.sec-chip').length === 3)
  check('set exam has 60 questions', text().includes('จาก 60'))

  await tap(document.querySelectorAll('.option')[1], 20)
  await tap(byText('.quiz-foot button', 'ข้อถัดไป'), 20)

  /* pause, check resume list on home */
  await tap(document.querySelector('.topbar .icon-btn[aria-label="หยุดพัก"]'), 30)
  await tap(byText('.sheet button', 'พักไว้ก่อน'), 40)
  await tap(byText('.paused-card button', 'กลับหน้าหลัก'), 60)
  await tap(byText('.nav-item', 'หน้าแรก'), 60)
  check('home shows resume card', !!document.querySelector('.resume-card'))

  await tap(document.querySelector('.resume-card'), 120)
  check('resume card continues set exam', text().includes('จาก 60'))
  /* answer the whole set quickly via palette-free loop */
  for (let i = 0; i < 60; i += 1) {
    await tap(document.querySelectorAll('.option')[0], 3)
    await tap(byText('.quiz-foot button', 'ข้อถัดไป') || byText('.quiz-foot button', 'ส่งคำตอบ'), 3)
  }
  await tap(byText('.quiz-foot button', 'ส่งคำตอบ'), 20)
  await tap(byText('.sheet button', 'ส่งคำตอบ'), 120)

  const setResult = json(`bacc2569:results:${pid}`, []).find((r) => r.kind === 'set')
  check('set result saved with set metadata', !!setResult && setResult.setName && setResult.maxPoints === 65)
  check(
    'set result points within maximum',
    !!setResult && setResult.points >= 0 && setResult.points <= 65,
    setResult ? `${Math.round(setResult.points)}/65` : 'missing',
  )
  check('section summary rendered', document.querySelectorAll('.sec-result').length === 3)

  /* ================= 6. history ================= */
  await tap(byText('.btn', 'กลับหน้าแรก'), 60)
  await tap(byText('.nav-item', 'ผลสอบ'), 40)
  check('history lists both results', document.querySelectorAll('.hist-card').length === 2)

  check('history has type filter', document.querySelectorAll('.seg__item').length === 3)
  await tap(byText('.seg__item', 'ชุดสอบ'), 30)
  check('history filter works', document.querySelectorAll('.hist-card').length === 1)

  /* ================= 7. account sheet / profiles ================= */
  await tap(byText('.nav-item', 'หน้าแรก'), 40)
  await tap(document.querySelector('.avatar--btn'), 40)
  check('account sheet opens', !!document.querySelector('.acct'))
  await tap(byText('.seg__item', 'สลับผู้ใช้'), 30)
  const addInput = document.querySelector('.acct__add input')
  await act(async () => {
    type(addInput, 'สมหญิง ตั้งใจ')
    await sleep(20)
  })
  await tap(byText('.acct__add button', 'เพิ่ม'), 80)
  check('second profile created', json('bacc2569:profiles', []).length === 2)
  check('new profile starts with empty history', document.querySelectorAll('.hist-card').length === 0)
  const p2 = json('bacc2569:profiles', []).find((p) => p.name === 'สมหญิง ตั้งใจ')
  check('history kept separate per profile', json(`bacc2569:results:${p2.id}`, []).length === 0)
  check('sets shared across profiles', json('bacc2569:sets', []).length === 1)

  /* switch back */
  await tap(document.querySelector('.avatar--btn'), 30)
  await tap(byText('.seg__item', 'สลับผู้ใช้'), 30)
  await tap(byText('.profile-item', 'สมชาย ใจดี'), 80)
  check('switching back restores history', json(`bacc2569:results:${pid}`, []).length === 2)

  /* ================= 8. sources + reader ================= */
  await tap(byText('.nav-item', 'เอกสาร'), 50)
  check('sources page lists 16 files', document.querySelectorAll('.source-item').length === 16)
  await tap(document.querySelectorAll('.source-item .icon-btn')[0], 120)
  check('reader blocks non-PDF documents', !!document.querySelector('.reader__blocked'))
  check('blocked document renders no iframe', !document.querySelector('.reader iframe'))
  await tap(document.querySelector('.reader__bar button'), 40)
  check('reader closes', !document.querySelector('.reader'))

  await tap(document.querySelectorAll('.source-item')[1].querySelector('.icon-btn'), 120)
  check('document reader opens PDF in-app', !!document.querySelector('.reader iframe'))
  check(
    'reader uses drive pdf preview embed',
    (document.querySelector('.reader iframe')?.getAttribute('src') || '').includes('/preview'),
  )
  check('reader lists only PDF files', document.querySelectorAll('.reader__file').length === 15)
  check(
    'reader footer credit',
    (document.querySelector('.reader__copy')?.textContent || '').includes('Ton Skywalker'),
  )
  await tap(document.querySelector('.reader__bar button'), 40)
  check('reader closes again', !document.querySelector('.reader'))

  /* ================= 9. github sync ================= */
  await tap(byText('.nav-item', 'หน้าแรก'), 50)
  check(
    'leaderboard reflects results',
    Array.from(document.querySelectorAll('.board__row')).some((r) =>
      (r.textContent || '').includes('%'),
    ),
  )
  await tap(document.querySelector('.avatar--btn'), 50)
  check('github panel rendered in settings', !!document.querySelector('.gh'))
  check('github panel explains storage', text().includes('คลังข้อมูล GitHub'))
  check(
    'panel defaults to the simplest mode',
    (document.querySelector('.gh__mode.is-on')?.textContent || '').includes('Secret Gist'),
  )
  check(
    'panel lists what will be stored (settings + history)',
    (document.querySelector('.gh__data')?.textContent || '').includes('ประวัติผลสอบ') &&
      (document.querySelector('.gh__data')?.textContent || '').includes('การตั้งค่า · เฉลยทันที'),
  )

  const tokenInput = document.querySelector('.gh__form input[type="password"]')
  await act(async () => {
    type(tokenInput, 'ghp_smoke_token')
    await sleep(20)
  })

  await tap(byText('.gh__mode', 'Repository'), 60)
  check('repository mode shows owner/repo fields', document.querySelectorAll('.gh__grid input').length >= 4)
  await tap(byText('.gh__owner button', 'ดึงชื่อ'), 300)
  check(
    'owner autofilled from token',
    document.querySelectorAll('.gh__grid input')[0]?.value === 'tester',
    document.querySelectorAll('.gh__grid input')[0]?.value,
  )
  await act(async () => {
    type(document.querySelectorAll('.gh__grid input')[1], 'BACC_TEST_2026')
    await sleep(20)
  })
  await tap(byText('.gh__actions button', 'เชื่อมต่อและบันทึก'), 600)

  const ghCfg = json('bacc2569:github', null)
  check(
    'github config saved locally',
    !!ghCfg && ghCfg.owner === 'tester' && ghCfg.repo === 'BACC_TEST_2026' && ghCfg.token === 'ghp_smoke_token',
  )
  check(
    'connection verified against GitHub API',
    fetchCalls.some((c) => c.method === 'GET' && c.url.includes('/repos/tester/BACC_TEST_2026')),
  )

  const puts = fetchCalls.filter((c) => c.method === 'PUT' && c.url.includes('/contents/'))
  check('snapshot pushed to github repo', puts.length > 0, `${puts.length} PUT`)
  if (puts.length) {
    const payload = JSON.parse(puts[puts.length - 1].body)
    const snap = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'))
    check(
      'pushed snapshot has profiles/results/sets',
      Array.isArray(snap.profiles) &&
        snap.profiles.length === 2 &&
        (snap.results[pid] || []).length === 2 &&
        snap.sets.length === 1,
      `profiles=${snap.profiles?.length} results=${(snap.results?.[pid] || []).length}`,
    )
    check('pushed snapshot excludes token', !JSON.stringify(snap).includes('ghp_smoke_token'))
    check('push uses commit message', String(payload.message || '').startsWith('bacc: sync'))
    const local = exportSnapshot()
    check(
      'pushed snapshot equals local snapshot',
      snap.profiles.length === local.profiles.length && snap.sets.length === local.sets.length,
    )
  }
  check(
    'sync status shows saved',
    !!document.querySelector('.gh__dot.is-ok') ||
      (document.querySelector('.gh__head-text')?.textContent || '').includes('บันทึกขึ้น GitHub แล้ว'),
    (document.querySelector('.gh__head-text')?.textContent || '').slice(0, 60),
  )
  check(
    'connected view shows repo target',
    (document.querySelector('.gh__meta')?.textContent || '').includes('tester/BACC_TEST_2026'),
  )

  /* sync chip on home */
  await tap(document.querySelector('.sheet-backdrop'), 40)
  await tap(byText('.nav-item', 'หน้าแรก'), 60)
  check(
    'home shows github sync status',
    (document.querySelector('.sync-chip')?.textContent || '').includes('GitHub'),
    (document.querySelector('.sync-chip')?.textContent || '').slice(0, 40),
  )

  await tap(byText('.nav-item', 'ชุดสอบ'), 60)
  check(
    'sets page shows github backup target once connected',
    (document.querySelector('.store-note')?.textContent || '').includes('GitHub'),
    (document.querySelector('.store-note')?.textContent || '').slice(0, 50),
  )
  await tap(byText('.nav-item', 'หน้าแรก'), 60)

  /* pull + merge from a pre-existing remote snapshot */
  const remoteSnap = {
    app: 'bacc-exam-2569',
    version: 2,
    updatedAt: '2026-01-02T00:00:00.000Z',
    profiles: [
      ...getProfiles(),
      { id: 'remote-tester', name: 'เพื่อนร่วมทีม', createdAt: '2026-01-02T00:00:00.000Z' },
    ],
    results: {},
    attempts: {},
    sets: [],
    settings: { instantReveal: true },
    theme: 'light',
  }
  setRemotePayload(remoteSnap)
  saveGithubConfig({ mode: 'repo', token: 'ghp_smoke_token', owner: 'tester', repo: 'BACC_TEST_2026' })
  let pulled = false
  await act(async () => {
    pulled = await pullAndMerge()
  })
  check('pull from github succeeds', pulled === true)
  check(
    'pull merges remote profiles without dropping local ones',
    getProfiles().length === 3 && !!getProfiles().find((p) => p.id === 'remote-tester'),
    `${getProfiles().length} profiles`,
  )
  /* a settings change alone triggers an automatic push */
  saveGithubConfig({ mode: 'repo', token: 'ghp_smoke_token', owner: 'tester', repo: 'BACC_TEST_2026' })
  const putsBefore = fetchCalls.filter((c) => c.method === 'PUT' && c.url.includes('/contents/')).length
  await tap(document.querySelector('.avatar--btn'), 60)
  const acctSwitches = document.querySelectorAll('.acct__panel .switch')
  check('settings show instant-reveal switch', acctSwitches.length >= 2)
  await tap(acctSwitches[1], 40)
  await act(async () => {
    await sleep(2300)
  })
  const allPuts = fetchCalls.filter((c) => c.method === 'PUT' && c.url.includes('/contents/'))
  check('settings change auto-pushes to github', allPuts.length > putsBefore, `${allPuts.length} PUT`)
  if (allPuts.length > putsBefore) {
    const lastPayload = JSON.parse(allPuts[allPuts.length - 1].body)
    const lastSnap = JSON.parse(Buffer.from(lastPayload.content, 'base64').toString('utf8'))
    check(
      'pushed settings reflect the toggle',
      lastSnap.settings && lastSnap.settings.instantReveal === false,
      JSON.stringify(lastSnap.settings),
    )
    check(
      'pushed snapshot keeps full history',
      (lastSnap.results[pid] || []).length === 2 && lastSnap.profiles.length === 3,
      `results=${(lastSnap.results?.[pid] || []).length} profiles=${lastSnap.profiles?.length}`,
    )
  }

  setRemotePayload(null)
  await act(async () => {
    clearGithubConfig()
    resetSyncState()
    saveSettings({ instantReveal: true })
    await sleep(30)
  })

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
  process.exit(1)
})
