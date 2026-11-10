/* ============================================================
   Exam generator — สร้าง "ข้อสอบเสมือนจริง" ตามโครงสร้างประกาศ
   - seed เดียวกัน → ได้ชุดข้อสอบเดิมเสมอ (แชร์กันได้)
   - มีเทมเพลตข้อสอบคำนวณ/ความละเอียดที่สร้างใหม่ไม่ซ้ำ
   ============================================================ */

import { PARTS } from '../data/index.js'
import { extraPoolFor } from './banks.js'

/* ---------- deterministic RNG ---------- */
export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(a) {
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1))
const pickOne = (rng, arr) => arr[Math.floor(rng() * arr.length)]

export function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const fmt = (n) =>
  Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 })

/* ---------- สลับตัวเลือก + remap คำตอบ ---------- */
export function shuffleOptions(q, rng) {
  const correct = q.o[q.a]
  const opts = shuffle(q.o, rng)
  const a = opts.indexOf(correct)
  return { ...q, o: opts, a }
}

/* ============================================================
   เทมเพลตข้อสอบคำนวณ (คณิตศาสตร์)
   ============================================================ */
const mathTemplates = [
  // อนุกรมผลต่างเพิ่มขึ้น
  (rng) => {
    const start = randInt(rng, 1, 9)
    const step = randInt(rng, 2, 6)
    const inc = randInt(rng, 1, 3)
    const terms = [start]
    let s = step
    for (let i = 0; i < 4; i += 1) {
      terms.push(terms[terms.length - 1] + s)
      s += inc
    }
    const ans = terms[terms.length - 1] + s
    const opts = [ans, ans + inc, ans - 1, ans + s]
    return {
      t: 'อนุกรมและลำดับ',
      l: 'ง่าย',
      q: `จงหาจำนวนถัดไปของอนุกรม\n${terms.join('  ')}  ?`,
      o: opts.map(fmt),
      a: 0,
      e: `ผลต่างเพิ่มขึ้นครั้งละ ${inc} (${step}, ${step + inc}, ${step + inc * 2}, …) ดังนั้นพจน์ถัดไป = ${fmt(
        terms[terms.length - 1],
      )} + ${s} = ${fmt(ans)}`,
    }
  },
  // ส่วนลดซ้อน
  (rng) => {
    const price = pickOne(rng, [800, 1200, 1500, 2000, 2400, 3000, 4000])
    const d1 = pickOne(rng, [10, 15, 20, 25])
    const d2 = pickOne(rng, [5, 10, 20])
    const after1 = price * (1 - d1 / 100)
    const ans = after1 * (1 - d2 / 100)
    const wrong1 = price * (1 - (d1 + d2) / 100)
    const wrong2 = after1
    const wrong3 = price * (1 - d1 / 100 - d2 / 100) + price * 0.02
    return {
      t: 'ร้อยละ กำไร–ขาดทุน',
      l: 'ปานกลาง',
      q: `สินค้าราคาป้าย ${fmt(price)} บาท ทางร้านลดให้ ${d1}% และลดให้อีก ${d2}% ของราคาที่ลดแล้ว ลูกค้าต้องจ่ายเงินเท่าไร`,
      o: [fmt(ans), fmt(wrong1), fmt(wrong2), fmt(Math.round(wrong3))],
      a: 0,
      e: `ราคาหลังลดครั้งแรก = ${fmt(price)} × ${(1 - d1 / 100).toFixed(2)} = ${fmt(after1)} บาท แล้วลดอีก ${d2}% = ${fmt(
        after1,
      )} × ${(1 - d2 / 100).toFixed(2)} = ${fmt(ans)} บาท`,
    }
  },
  // ดอกเบี้ยธรรมดา
  (rng) => {
    const principal = randInt(rng, 4, 60) * 5000
    const rate = pickOne(rng, [1.5, 2, 2.5, 3, 3.5])
    const months = pickOne(rng, [6, 9, 12, 18])
    const ans = principal * (rate / 100) * (months / 12)
    return {
      t: 'ดอกเบี้ย',
      l: 'ปานกลาง',
      q: `ฝากเงิน ${fmt(principal)} บาท อัตราดอกเบี้ย ${rate}% ต่อปี เป็นเวลา ${months} เดือน จะได้รับดอกเบี้ยเท่าไร (ดอกเบี้ยแบบธรรมดา)`,
      o: [fmt(ans), fmt(ans * 2), fmt(principal * (rate / 100)), fmt(ans / 2)],
      a: 0,
      e: `ดอกเบี้ย = ${fmt(principal)} × ${rate}% × ${months}/12 = ${fmt(ans)} บาท`,
    }
  },
  // อัตราส่วน
  (rng) => {
    const pairs = [
      [3, 5],
      [2, 5],
      [4, 7],
      [5, 8],
      [3, 7],
      [5, 9],
    ]
    const [a, b] = pickOne(rng, pairs)
    const unit = randInt(rng, 2, 9) * 500
    const A = a * unit
    const B = b * unit
    return {
      t: 'อัตราส่วนและสัดส่วน',
      l: 'ปานกลาง',
      q: `เงินเดือนของนาย ก ต่อนาย ข เป็น ${a} : ${b} ถ้านาย ข ได้เงินเดือนมากกว่านาย ก ${fmt(
        B - A,
      )} บาท นาย ก ได้เงินเดือนเท่าไร`,
      o: [fmt(A), fmt(B), fmt(A + unit), fmt(A * 2)],
      a: 0,
      e: `ส่วนต่าง ${b - a} ส่วน = ${fmt(B - A)} บาท → 1 ส่วน = ${fmt(unit)} บาท นาย ก (${a} ส่วน) = ${fmt(A)} บาท`,
    }
  },
  // งาน–เวลา
  (rng) => {
    const pairs = [
      [12, 18],
      [10, 15],
      [8, 12],
      [6, 12],
      [9, 18],
      [20, 30],
      [15, 10],
      [24, 8],
    ]
    const [x, y] = pickOne(rng, pairs)
    const ans = (x * y) / (x + y)
    return {
      t: 'งาน เวลา และความเร็ว',
      l: 'ปานกลาง',
      q: `นาย ก ทำงานชิ้นหนึ่งเสร็จใน ${x} วัน นาย ข ทำงานชิ้นเดียวกันเสร็จใน ${y} วัน ถ้าช่วยกันทำจะใช้เวลากี่วัน`,
      o: [`${fmt(ans)} วัน`, `${fmt(ans + 1)} วัน`, `${fmt((x + y) / 2)} วัน`, `${fmt(Math.abs(x - y) / 2)} วัน`],
      a: 0,
      e: `อัตราทำงานรวม = 1/${x} + 1/${y} = ${x + y}/${x * y} ของงานต่อวัน ใช้เวลา ${x * y}/${x + y} = ${fmt(ans)} วัน`,
    }
  },
  // ความเร็ว
  (rng) => {
    const speed = pickOne(rng, [60, 65, 72, 75, 80, 90])
    const hours = pickOne(rng, [1.5, 2, 2.5, 3])
    const dist = speed * hours
    return {
      t: 'งาน เวลา และความเร็ว',
      l: 'ง่าย',
      q: `รถยนต์วิ่งได้ระยะทาง ${fmt(dist)} กิโลเมตร ภายในเวลา ${hours} ชั่วโมง ความเร็วเฉลี่ยเท่าไร`,
      o: [`${fmt(speed)} กม./ชม.`, `${fmt(speed + 8)} กม./ชม.`, `${fmt(speed - 6)} กม./ชม.`, `${fmt(speed * 1.2)} กม./ชม.`],
      a: 0,
      e: `ความเร็ว = ระยะทาง ÷ เวลา = ${fmt(dist)} ÷ ${hours} = ${fmt(speed)} กม./ชม.`,
    }
  },
  // พีชคณิต/อายุ
  (rng) => {
    const cases = [
      [3, 2, 10],
      [4, 3, 10],
      [5, 3, 12],
      [4, 2, 12],
      [3, 2, 8],
    ]
    const [k, m, n] = pickOne(rng, cases)
    const C = (m * n - n) / (k - m)
    if (!Number.isInteger(C)) return null
    return {
      t: 'พีชคณิตและอายุ',
      l: 'ยาก',
      q: `ปัจจุบันบิดามีอายุเป็น ${k} เท่าของบุตร อีก ${n} ปีข้างหน้า บิดาจะมีอายุเป็น ${m} เท่าของบุตร ปัจจุบันบุตรอายุเท่าไร`,
      o: [`${C} ปี`, `${C + 2} ปี`, `${C - 2} ปี`, `${C + 5} ปี`],
      a: 0,
      e: `ให้บุตรอายุ x ปี บิดา ${k}x → ${k}x + ${n} = ${m}(x + ${n}) → x = ${C} ปี`,
    }
  },
  // เรขาคณิต
  (rng) => {
    const w = randInt(rng, 4, 12)
    const h = w + randInt(rng, 3, 10)
    const p = pickOne(rng, [10, 20, 25, 50])
    const percent = (Math.pow(1 + p / 100, 2) - 1) * 100
    const area = w * h
    const newArea = area * Math.pow(1 + p / 100, 2)
    return {
      t: 'เรขาคณิต',
      l: 'ยาก',
      q: `สี่เหลี่ยมผืนผ้ากว้าง ${w} ซม. ยาว ${h} ซม. ถ้าเพิ่มความกว้างและความยาวด้านละ ${p}% พื้นที่จะเพิ่มขึ้นร้อยละเท่าไร`,
      o: [`${fmt(Math.round(percent * 100) / 100)}%`, `${p}%`, `${p * 2}%`, `${fmt(p * 2 - p / 4)}%`],
      a: 0,
      e: `พื้นที่เดิม ${w}×${h} = ${fmt(area)} ตร.ซม. ด้านใหม่ ${fmt(w * (1 + p / 100))}×${fmt(
        h * (1 + p / 100),
      )} = ${fmt(Math.round(newArea * 100) / 100)} ตร.ซม. เพิ่มขึ้น ${fmt(Math.round(percent * 100) / 100)}%`,
    }
  },
  // สถิติ
  (rng) => {
    const nums = []
    while (nums.length < 6) nums.push(randInt(rng, 3, 20))
    nums.sort((a, b) => a - b)
    const median = (nums[2] + nums[3]) / 2
    const mean = Math.round((nums.reduce((s, n) => s + n, 0) / 6) * 100) / 100
    const askMedian = rng() > 0.5
    const ans = askMedian ? median : mean
    return {
      t: 'สถิติและความน่าจะเป็น',
      l: 'ง่าย',
      q: `ข้อมูลชุดหนึ่งมีค่า ${nums.join(', ')} ${askMedian ? 'ค่ามัธยฐาน' : 'ค่าเฉลี่ยเลขคณิต'}ของข้อมูลชุดนี้เท่าไร`,
      o: [fmt(ans), fmt(ans + 1), fmt(ans - 0.5 > 0 ? ans - 0.5 : ans + 2), fmt(nums[5])],
      a: 0,
      e: askMedian
        ? `ข้อมูลเรียงแล้ว 6 ค่า มัธยฐาน = (${nums[2]} + ${nums[3]}) ÷ 2 = ${fmt(median)}`
        : `ผลรวม = ${nums.reduce((s, n) => s + n, 0)} หาร 6 = ${fmt(mean)}`,
    }
  },
  // ความน่าจะเป็น
  (rng) => {
    const sum = pickOne(rng, [5, 6, 7, 8, 9])
    const ways = (() => {
      let c = 0
      for (let i = 1; i <= 6; i += 1) for (let j = 1; j <= 6; j += 1) if (i + j === sum) c += 1
      return c
    })()
    const g = (() => {
      let a = ways
      let b = 36
      while (b) {
        ;[a, b] = [b, a % b]
      }
      return a
    })()
    return {
      t: 'สถิติและความน่าจะเป็น',
      l: 'ปานกลาง',
      q: `ทอยลูกเต๋าที่เที่ยงตรง 2 ลูกพร้อมกัน ความน่าจะเป็นที่ผลรวมของแต้มบนหน้าลูกเต๋าเป็น ${sum} เท่ากับเท่าไร`,
      o: [`${ways / g}/${36 / g}`, `${(ways + 2) / g}/${36 / g}`, `1/${sum}`, `${(ways - 1) / g}/${36 / g}`],
      a: 0,
      e: `ผลลัพธ์ทั้งหมด 36 แบบ ผลรวมเป็น ${sum} มี ${ways} แบบ = ${ways}/36 = ${ways / g}/${36 / g}`,
    }
  },
  // กำไร–ขาดทุน
  (rng) => {
    const cost = randInt(rng, 2, 20) * 500
    const pct = pickOne(rng, [10, 12, 15, 20, 25, 30])
    const price = cost * (1 + pct / 100)
    return {
      t: 'ร้อยละ กำไร–ขาดทุน',
      l: 'ง่าย',
      q: `ซื้อสินค้ามาในราคา ${fmt(cost)} บาท แล้วขายได้กำไร ${pct}% จะขายสินค้าในราคาเท่าไร`,
      o: [fmt(price), fmt(cost * pct / 100), fmt(price + cost * 0.05), fmt(cost)],
      a: 0,
      e: `กำไร = ${fmt(cost)} × ${pct}% = ${fmt((cost * pct) / 100)} บาท ราคาขาย = ${fmt(cost)} + ${fmt(
        (cost * pct) / 100,
      )} = ${fmt(price)} บาท`,
    }
  },
]

/* ============================================================
   เทมเพลตข้อสอบความละเอียดแม่นยำ
   ============================================================ */
const THAI_WORDS = [
  'สินเชื่อเพื่อการเกษตร',
  'ธนาคารเพื่อการเกษตรและสหกรณ์',
  'ความละเอียดแม่นยำ',
  'การเงินการธนาคาร',
  'พนักงานการเงินระดับสี่',
  'เศรษฐกิจพอเพียง',
  'ระบบสารสนเทศ',
]

const mutateWord = (word, rng, mode) => {
  const chars = [...word]
  const idxs = chars.map((c, i) => i).filter((i) => chars[i].trim() !== '')
  if (mode === 'delete') {
    const i = pickOne(rng, idxs)
    return chars.filter((_, k) => k !== i).join('')
  }
  if (mode === 'swap') {
    const i = pickOne(rng, idxs.slice(0, -1))
    const tmp = chars[i]
    chars[i] = chars[i + 1]
    chars[i + 1] = tmp
    return chars.join('')
  }
  if (mode === 'dupe') {
    const i = pickOne(rng, idxs)
    return chars.slice(0, i + 1).join('') + chars[i] + chars.slice(i + 1).join('')
  }
  return `${word} ` // trailing space
}

const precisionTemplates = [
  // เทียบรหัส
  (rng) => {
    const letters = ['BAAC', 'EXAM', 'THAI', 'BANK']
    const prefix = pickOne(rng, letters)
    const mid = String(randInt(rng, 1000, 9999))
    const suffix = pickOne(rng, ['TH', 'BA', 'AC', 'KK'])
    const code = `${prefix}-${mid}-${suffix}`
    const swapDigit = (s) => {
      const idx = s.search(/\d/)
      const arr = [...s]
      const i = idx + randInt(rng, 0, 3)
      const other = idx + ((i - idx + 1) % 4)
      ;[arr[i], arr[other]] = [arr[other], arr[i]]
      return arr.join('')
    }
    return {
      t: 'การเปรียบเทียบข้อมูล',
      l: 'ง่าย',
      q: `ข้อใดมีตัวอักษรและตัวเลขตรงกับรหัส "${code}" ทุกตัว`,
      o: [code, swapDigit(code), code.replace(suffix, [...suffix].reverse().join('')), `${prefix}-${mid}-${suffix[0]}${suffix[0]}`],
      a: 0,
      e: `รหัสที่ถูกต้องคือ ${code} ตัวเลือกอื่นมีการสลับตัวเลขหรือตัวอักษร`,
    }
  },
  // นับตัวเลข
  (rng) => {
    const target = randInt(rng, 2, 9)
    const make = (count, len = 7) => {
      const arr = []
      for (let i = 0; i < len; i += 1) arr.push(String(randInt(rng, 0, 9)))
      // บังคับจำนวนเป้าหมาย
      const positions = shuffle(arr.map((_, i) => i), rng).slice(0, count)
      const rest = arr.map((_, i) => i).filter((i) => !positions.includes(i))
      positions.forEach((p) => {
        arr[p] = String(target)
      })
      rest.forEach((p) => {
        let d = String(randInt(rng, 0, 9))
        if (d === String(target)) d = String((target + 1) % 10)
        arr[p] = d
      })
      return arr.join('')
    }
    const want = randInt(rng, 2, 3)
    const correct = make(want)
    const others = [make(want + 1), make(want - 1 > 0 ? want - 1 : want + 2), make(want + 2)]
    return {
      t: 'การนับจำนวน',
      l: 'ปานกลาง',
      q: `ข้อใดมีเลข ${target} ปรากฏอยู่ ${want} ครั้ง`,
      o: [correct, ...others],
      a: 0,
      e: `นับแล้วมีเพียง ${correct} ที่มีเลข ${target} จำนวน ${want} ตัว`,
    }
  },
  // ข้อความเหมือนกัน
  (rng) => {
    const word = pickOne(rng, THAI_WORDS)
    const modes = ['delete', 'swap', 'dupe']
    const opts = [word, ...shuffle(modes, rng).map((m) => mutateWord(word, rng, m))]
    return {
      t: 'การเปรียบเทียบข้อความ',
      l: 'ง่าย',
      q: `ข้อใดเขียนเหมือนกับ "${word}" ทุกประการ`,
      o: opts,
      a: 0,
      e: `ข้อความที่ตรงกันทุกตัวอักษรคือ "${word}" ตัวเลือกอื่นมีตัวอักษรขาด/สลับ/เกิน`,
    }
  },
  // เรียงลำดับ
  (rng) => {
    const nums = []
    while (nums.length < 4) {
      const n = randInt(rng, 1000, 9999)
      if (!nums.includes(n)) nums.push(n)
    }
    const desc = [...nums].sort((a, b) => b - a)
    const wrongs = [
      [desc[0], desc[2], desc[1], desc[3]],
      [desc[1], desc[0], desc[3], desc[2]],
      [desc[0], desc[1], desc[3], desc[2]],
    ]
    return {
      t: 'การเรียงลำดับ',
      l: 'ปานกลาง',
      q: `ข้อใดเรียงตัวเลขต่อไปนี้จากมากไปน้อยได้ถูกต้อง\n${nums.join('  ')}`,
      o: [desc.join('  '), ...wrongs.map((w) => w.join('  '))],
      a: 0,
      e: `เรียงจากมากไปน้อย: ${desc.join(' > ')}`,
    }
  },
  // นับตัวอักษรในคำ
  (rng) => {
    const cases = [
      ['ทบทวนบทท้าย', 'ท'],
      ['การเกษตรและสหกรณ์การเกษตร', 'ก'],
      ['ธนาคารเพื่อการเกษตร', 'ร'],
      ['ความละเอียดแม่นยำ', 'ม'],
      ['สินเชื่อเพื่อการเกษตร', 'เ'],
    ]
    const [word, ch] = pickOne(rng, cases)
    const count = [...word].filter((c) => c === ch).length
    return {
      t: 'การนับตัวอักษร',
      l: 'ยาก',
      q: `คำว่า "${word}" มีตัวอักษร "${ch}" ปรากฏอยู่กี่ครั้ง`,
      o: [`${count} ครั้ง`, `${count + 1} ครั้ง`, `${Math.max(1, count - 1)} ครั้ง`, `${count + 2} ครั้ง`],
      a: 0,
      e: `นับได้ ${count} ครั้ง`,
    }
  },
  // เลขไทย–อารบิก
  (rng) => {
    const digits = Array.from({ length: 9 }, () => randInt(rng, 0, 9)).join('')
    const thai = digits.replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[Number(d)])
    const wrong = (s) => {
      const arr = [...s]
      ;[arr[0], arr[1]] = [arr[1], arr[0]]
      return arr.join('')
    }
    return {
      t: 'เลขไทย–เลขอารบิก',
      l: 'ปานกลาง',
      q: `ตัวเลข "${thai}" ตรงกับข้อใด`,
      o: [digits, wrong(digits), wrong(digits.split('').reverse().join('')), digits.split('').reverse().join('')],
      a: 0,
      e: `แปลงเลขไทยเป็นอารบิกได้ ${digits}`,
    }
  },
]

/* ---------- สร้างชุดข้อสอบจากเทมเพลต ---------- */
function buildFromTemplates(rng, templates, count, tag) {
  const out = []
  let guard = 0
  while (out.length < count && guard < count * 20) {
    guard += 1
    const tpl = templates[Math.floor(rng() * templates.length)]
    const q = tpl(rng)
    if (!q) continue
    if (!q.o || q.o.length !== 4) continue
    if (new Set(q.o.map(String)).size !== 4) continue
    if (out.some((prev) => prev.q === q.q)) continue
    out.push({ ...q, t: q.t, tag, gen: true })
  }
  return out
}

export const makeMathQuestions = (rng, count = 40) => buildFromTemplates(rng, mathTemplates, count, 'คำนวณ')
export const makePrecisionQuestions = (rng, count = 40) => buildFromTemplates(rng, precisionTemplates, count, 'ละเอียด')

/* ============================================================
   โครงสร้างข้อสอบตามประกาศ
   ============================================================ */
export const EXAM_SECTIONS = [
  {
    key: 'general',
    label: 'ความรู้ความสามารถทั่วไป',
    short: 'ทั่วไป',
    parts: ['1-1', '1-2', '1-3', '1-4', '1-5'],
    official: { count: 80, points: 100 },
    mini: { count: 21, points: 26 },
    color: '#1D4ED8',
  },
  {
    key: 'detail',
    label: 'ความละเอียดแม่นยำ',
    short: 'ละเอียด',
    parts: ['2'],
    official: { count: 50, points: 50 },
    mini: { count: 13, points: 13 },
    color: '#0891B2',
  },
  {
    key: 'professional',
    label: 'ความรู้เฉพาะตำแหน่ง',
    short: 'เฉพาะตำแหน่ง',
    parts: ['3-1', '3-2', '3-3', '3-4', '3-5'],
    official: { count: 100, points: 100 },
    mini: { count: 26, points: 26 },
    color: '#0B3B8C',
  },
]

export const EXAM_SIZES = {
  official: {
    key: 'official',
    label: 'ตามประกาศทางการ',
    desc: '80 + 50 + 100 ข้อ = 230 ข้อ · 250 คะแนน',
    minutes: 240,
  },
  mini: {
    key: 'mini',
    label: 'ชุดย่อ (ซ้อมเร็ว)',
    desc: '21 + 13 + 26 ข้อ = 60 ข้อ · 65 คะแนน',
    minutes: 60,
  },
}

/* ---------- ติดตั้ง pool ของแต่ละพาร์ท ---------- */
function poolFor(partId, rng) {
  const part = PARTS.find((p) => p.id === partId)
  if (!part) return []
  const tag = (q) => ({ ...q, partId: part.id, partTitle: part.title })
  const seen = new Set()
  const uniq = (arr) =>
    arr.filter((q) => {
      const key = String(q.q).replace(/\s+/g, ' ').trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

  const authored = uniq(part.questions.map(tag))
  if (partId === '1-1') return [...authored, ...uniq(makeMathQuestions(rng, 52).map(tag))]
  if (partId === '2') return [...authored, ...uniq(makePrecisionQuestions(rng, 52).map(tag))]
  return [...authored, ...uniq(extraPoolFor(partId, rng).map(tag))]
}

/* ---------- สุ่มจำนวนข้อต่อพาร์ท ---------- */
function distribute(total, keys, rng) {
  const base = Math.floor(total / keys.length)
  const rest = total % keys.length
  const extra = shuffle(keys.map((_, i) => i), rng).slice(0, rest)
  return keys.map((_, i) => base + (extra.includes(i) ? 1 : 0))
}

/* ============================================================
   generateExam — สร้างชุดข้อสอบจาก seed
   ============================================================ */
export function generateExam({ seed, sizeKey = 'official', name = 'ชุดสอบเสมือนจริง' }) {
  const rng = mulberry32(hashSeed(String(seed)))
  const size = EXAM_SIZES[sizeKey] || EXAM_SIZES.official
  const used = new Set()

  const sections = EXAM_SECTIONS.map((sec) => {
    const conf = sizeKey === 'mini' ? sec.mini : sec.official
    const targets = distribute(conf.count, sec.parts, rng)
    const questions = []

    sec.parts.forEach((partId, i) => {
      const need = targets[i]
      const pool = shuffle(poolFor(partId, rng), rng)
      let taken = []
      let round = 0
      while (taken.length < need) {
        const source = round === 0 ? pool : shuffle(pool, rng)
        for (const item of source) {
          if (taken.length >= need) break
          taken.push(item)
        }
        round += 1
        if (round > 30) break
      }
      taken = taken.slice(0, need)
      taken.forEach((q) => {
        /* ข้อสอบที่เขียนไว้แล้วคงลำดับตัวเลือกเดิม เพื่อให้คำอธิบาย/ภาพตัวเลือกตรงกัน */
        const inst = q.gen ? shuffleOptions(q, rng) : q
        const key = `${q.partId}|${q.q}`
        let copy = inst
        if (used.has(key)) {
          copy = { ...inst, repeated: true }
        } else {
          used.add(key)
        }
        questions.push({
          ...copy,
          sectionKey: sec.key,
          sectionLabel: sec.label,
          points: conf.points / conf.count,
        })
      })
    })

    const mixed = shuffle(questions, rng)
    return {
      key: sec.key,
      label: sec.label,
      short: sec.short,
      color: sec.color,
      count: conf.count,
      points: conf.points,
      questions: mixed,
    }
  })

  const questions = sections.flatMap((s) => s.questions)
  return {
    seed: String(seed),
    sizeKey,
    name,
    minutes: size.minutes,
    sections,
    questions,
    totalCount: questions.length,
    totalPoints: sections.reduce((sum, s) => sum + s.points, 0),
    repeats: questions.filter((q) => q.repeated).length,
  }
}

export const totalPoolSize = () =>
  PARTS.reduce((s, p) => s + p.questions.length, 0) + 48 + 48 + 220

export const newSeed = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
