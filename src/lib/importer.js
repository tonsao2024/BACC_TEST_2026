/* ============================================================
   Question importer — แปลงข้อความจาก DOCX/PDF (ที่คัดลอกมาเป็นข้อความ)
   ให้เป็นชุดข้อสอบของระบบ
   รูปแบบที่รองรับ (รูปแบบเดียวกับไฟล์คลังข้อสอบ ธ.ก.ส.)
     ข้อ 1. จงหา ... ?
     คณิตศาสตร์ › อนุกรมและลำดับ
     1)  36
     2)  37
     3)  38
     4)  39
     ...
     เฉลย
     1. 2
     2. 3
   รองรับตัวเลือกแบบ ก. ข. ค. ง. และตัวเลือกหลายบรรทัดด้วย
   ============================================================ */

const LETTER_TO_INDEX = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  ก: 0,
  ข: 1,
  ค: 2,
  ง: 3,
  a: 0,
  b: 1,
  c: 2,
  d: 3,
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()

const RE_QUESTION = /^ข้อ\s*(\d+)\s*[).:–-]?\s*(.*)$/
const RE_OPTION_NUM = /^([1-4])\s*[).]\s+(.*)$/
const RE_OPTION_THAI = /^([กขคง])\s*[).]\s+(.*)$/
const RE_TOPIC = /^(.+?)\s*›\s*(.+)$/
const RE_ANSWER = /^(\d+)\s*[).:\-–→]+\s*([1-4กขคง])\s*(?:[).:\-–—]\s*(.*))?$/

const isAnswerHeading = (line) => /^(เฉลย|ตารางสรุปเฉลย|answer\s*key|เฉลยคำตอบ)/i.test(line)

/**
 * @param {string} raw ข้อความดิบที่คัดลอกจากเอกสาร
 * @returns {{questions: Array, warnings: string[], answered: number}}
 */
export function parseQuestionText(raw) {
  const lines = String(raw || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\u00a0/g, ' ').trim())

  const questions = []
  const answers = new Map()
  const warnings = []
  let current = null
  let lastOption = null
  let inAnswers = false

  const pushCurrent = () => {
    if (current && current.o.filter(Boolean).length >= 2) questions.push(current)
    current = null
    lastOption = null
  }

  for (const line of lines) {
    if (!line) continue

    if (isAnswerHeading(line)) {
      pushCurrent()
      inAnswers = true
      continue
    }

    if (inAnswers) {
      const m = line.match(RE_ANSWER)
      if (m) {
        answers.set(Number(m[1]), LETTER_TO_INDEX[m[2].toLowerCase()] ?? LETTER_TO_INDEX[m[2]])
        if (m[3]) {
          const q = questions.find((x) => x._n === Number(m[1]))
          if (q) q.e = clean(m[3])
        }
      }
      continue
    }

    const qm = line.match(RE_QUESTION)
    if (qm) {
      pushCurrent()
      current = { _n: Number(qm[1]), q: clean(qm[2]), o: [], e: '', t: '' }
      if (current.q) lastOption = 'q'
      continue
    }

    const tm = line.match(RE_TOPIC)
    if (tm && current && !current.t) {
      current.t = clean(tm[2])
      current.part = clean(tm[1])
      continue
    }

    const on = line.match(RE_OPTION_NUM)
    const ot = line.match(RE_OPTION_THAI)
    if (current && (on || ot)) {
      const idx = LETTER_TO_INDEX[(on ? on[1] : ot[1]).toLowerCase()] ?? LETTER_TO_INDEX[on ? on[1] : ot[1]]
      const value = clean((on || ot)[2])
      if (idx !== undefined) {
        current.o[idx] = value
        lastOption = idx
        continue
      }
    }

    if (current) {
      if (lastOption === 'q' || lastOption === null) {
        current.q += ` ${clean(line)}`
      } else if (typeof lastOption === 'number') {
        current.o[lastOption] = `${current.o[lastOption] || ''} ${clean(line)}`.trim()
      } else {
        current.q += ` ${clean(line)}`
      }
    }
  }
  pushCurrent()

  let answered = 0
  const out = []
  questions.forEach((q) => {
    const a = answers.get(q._n)
    const options = q.o.map((o) => clean(o)).filter(Boolean)
    const stem = clean(q.q)
    if (!stem || options.length < 2) {
      warnings.push(`ข้ามข้อ ${q._n}: ข้อมูลไม่ครบ`)
      return
    }
    if (a === undefined) {
      warnings.push(`ข้อ ${q._n}: ไม่พบเฉลย`)
      return
    }
    if (options.length !== 4) {
      warnings.push(`ข้อ ${q._n}: ตัวเลือกไม่ครบ 4 ข้อ (${options.length})`)
      return
    }
    answered += 1
    out.push({
      q: stem,
      o: options,
      a,
      e: clean(q.e) || 'คำอธิบาย: พิจารณาเงื่อนไขในโจทย์แล้วเทียบกับตัวเลือกที่สอดคล้องที่สุด',
      t: q.t || 'คลังข้อสอบ',
      l: 'กลาง',
      n: q._n,
    })
  })

  return { questions: out, warnings, answered }
}

/** ตรวจว่าเป็นข้อความหลายข้อหรือไม่ (ใช้โชว์ตัวอย่างก่อนบันทึก) */
export const looksLikeQuestionBank = (text) => (String(text).match(/^ข้อ\s*\d+/gm) || []).length >= 2
