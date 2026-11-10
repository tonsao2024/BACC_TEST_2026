import { part11, part12, part13, part14, part15 } from './set1.js'
import { part2 } from './set2.js'
import { part31, part32, part33, part34, part35 } from './set3.js'
import { importedQuestions } from '../lib/storage.js'

/* ไฟล์ต้นฉบับทั้งหมดบน Google Drive (โฟลเดอร์กลางของชุดเอกสารเตรียมสอบ ธ.ก.ส. 2569) */
export const DRIVE_FOLDER_ID = '1zcaLIPT0u6estLdIFIm-0PPyF2ACkh7f'
export const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}?usp=sharing`
// Verified subfolder containing the exam PDFs. The requested link above remains the root folder.
export const DRIVE_OUTPUT_FOLDER_URL = 'https://drive.google.com/drive/folders/1Gs9Qv1lBvJHuz0HvcjtExP5fE8us85uc'

export const SOURCE_FILES = [
  { id: '1-prDA30BIW0GhXc91R2OO-nB7Oefzs_c', name: 'ประกาศรับสมัครพนักงานการเงิน ระดับ 4 ปีบัญชี 2569', type: 'PDF', category: 'notice' },
  { id: '1t-vrNSbxhQh1G9Sfzf-F-F00RzN907_O', name: '00_อ่านก่อน_สารบัญชุดเอกสาร', type: 'MD', category: 'other' },
  { id: '1yyNSVKclly5RgXlHpoZheQSoeKph4_BN', name: '01_คลังข้อสอบ_300ข้อ_ธกส', type: 'PDF', category: 'exam' },
  { id: '1Ke0jdg_g4H3AoDvQ5P9iyBHw72uKDwnm', name: '02_Mock_Exam_230ข้อ_ธกส', type: 'PDF', category: 'exam' },
  { id: '1LmS9ENbao3BLhiE5qeHJGgHh2L53m8D3', name: '03_เฉลย_Mock_Exam_230ข้อ_ธกส', type: 'PDF', category: 'exam' },
  { id: '1gLaCbczdoS3i6O82Ma38m7oRi0OXKcf_', name: '04_รายงานตรวจสอบคุณภาพข้อสอบ_12รอบ', type: 'PDF', category: 'quality' },
  { id: '1XDk1whM4xVtNnwHaH2_-WdjtpWOC9TBb', name: '05_พาร์ท1-1_คณิตศาสตร์_100ข้อ', type: 'PDF', category: 'part1' },
  { id: '1zrHLIiLxBGOb2Hv7w7JSPhHZvHelorSY', name: '06_พาร์ท1-2_วิเคราะห์และเหตุผล_100ข้อ', type: 'PDF', category: 'part1' },
  { id: '1JfBDrw8UKIVfqrCgSG0erioWPUIISiZ4', name: '07_พาร์ท1-3_ภาษาไทย_100ข้อ', type: 'PDF', category: 'part1' },
  { id: '11CyixZgNB1oCCK7DQ2Vh6uoDG9pH6-aS', name: '08_พาร์ท1-4_มิติสัมพันธ์_100ข้อ', type: 'PDF', category: 'part1' },
  { id: '1wBlxul9ijFX_S33OV3VNMDw3obKDOJ9e', name: '09_พาร์ท1-5_ภาษาอังกฤษ_100ข้อ', type: 'PDF', category: 'part1' },
  { id: '1jSB0ANlg8lKQY12luDkXVYxyrZ2XBfIX', name: '10_พาร์ท3-1_หลักการบัญชี_100ข้อ', type: 'PDF', category: 'part3' },
  { id: '1VMqSuwzocAwboHoC9S8WlrSiVV7yWXgC', name: '11_พาร์ท3-2_การเงินการธนาคาร_100ข้อ', type: 'PDF', category: 'part3' },
  { id: '1TZVmSS-0kjBi8eIWQqHKN6FJQhC95aM7', name: '12_พาร์ท3-3_เศรษฐศาสตร์_100ข้อ', type: 'PDF', category: 'part3' },
  { id: '18_Y3pioXouro8aOt9ZdsuWxmVSLlC4Ou', name: '13_พาร์ท3-4_สินเชื่อและพัฒนาชนบท_100ข้อ', type: 'PDF', category: 'part3' },
  { id: '1nb1hKxHlz1QpilabRhOa-h3HeyYFGTf5', name: '14_พาร์ท3-5_การตลาด_100ข้อ', type: 'PDF', category: 'part3' },
  { id: '1QyIxxYbdmV6DV-JzOme-bLkGpS9c87Sx', name: '15_รายงานตรวจสอบคุณภาพ_ชุดขยาย11พาร์ท', type: 'PDF', category: 'quality' },
]

export const RECRUITMENT_NOTICE = SOURCE_FILES.find((file) => file.category === 'notice' && file.type === 'PDF')

export const SOURCE_GROUPS = [
  { id: 'notice', title: 'ประกาศรับสมัคร' },
  { id: 'exam', title: 'คลังข้อสอบและ Mock Exam' },
  { id: 'part1', title: 'พาร์ท 1 · ความรู้ความสามารถทั่วไป' },
  { id: 'part3', title: 'พาร์ท 3 · ความรู้เฉพาะตำแหน่ง' },
  { id: 'quality', title: 'รายงานตรวจสอบคุณภาพ' },
  { id: 'other', title: 'สารบัญและข้อมูลเพิ่มเติม' },
]

export const driveView = (id) => `https://drive.google.com/file/d/${id}/view`
export const driveDownload = (id) => `https://drive.google.com/uc?export=download&id=${id}`

/* ---------- คำอธิบายแต่ละพาร์ท ---------- */
export const PARTS = [
  {
    id: '1-1',
    label: '1.1',
    group: 'aptitude',
    title: 'คณิตศาสตร์',
    desc: 'ความสามารถเชิงคำนวณ อนุกรม ร้อยละ ดอกเบี้ย อัตราส่วน และสถิติ',
    icon: 'calc',
    color: '#1D4ED8',
    color2: '#60A5FA',
    minutes: 90,
    officialCount: 100,
    officialMinutes: 100,
    file: '1XDk1whM4xVtNnwHaH2_-WdjtpWOC9TBb',
    topics: ['อนุกรม–ลำดับ 16', 'ร้อยละ/กำไร–ขาดทุน 13', 'ดอกเบี้ย 12', 'อัตราส่วน 10', 'งาน–เวลา–ความเร็ว 14', 'พีชคณิต 7', 'เรขาคณิต 8', 'สถิติ–ความน่าจะเป็น 8', 'วิเคราะห์ตาราง 12'],
    questions: part11,
  },
  {
    id: '1-2',
    label: '1.2',
    group: 'aptitude',
    title: 'วิเคราะห์และเหตุผล',
    desc: 'อุปมาอุปไมย เงื่อนไขภาษา ตรรกะ และการให้เหตุผล',
    icon: 'brain',
    color: '#0E7490',
    color2: '#67E8F9',
    minutes: 80,
    officialCount: 100,
    officialMinutes: 100,
    file: '1zrHLIiLxBGOb2Hv7w7JSPhHZvHelorSY',
    topics: ['อุปมาอุปไมย 18', 'เงื่อนไขภาษา 28', 'เงื่อนไขสัญลักษณ์ 22', 'วิเคราะห์ข้อมูล 20', 'การให้เหตุผล 12'],
    questions: part12,
  },
  {
    id: '1-3',
    label: '1.3',
    group: 'aptitude',
    title: 'ภาษาไทย',
    desc: 'ชนิดของคำ คำยืม การสะกด สำนวน และการอ่านจับใจความ',
    icon: 'thai',
    color: '#0F766E',
    color2: '#5EEAD4',
    minutes: 70,
    officialCount: 100,
    officialMinutes: 100,
    file: '1JfBDrw8UKIVfqrCgSG0erioWPUIISiZ4',
    topics: ['ชนิดของคำ 15', 'คำยืม 9', 'การสะกด 13', 'การสร้างคำ 12', 'ราชาศัพท์ 13', 'สำนวน 14', 'ลักษณนาม 6', 'การอ่านจับใจความ 8', 'โวหาร 3'],
    questions: part13,
  },
  {
    id: '1-4',
    label: '1.4',
    group: 'aptitude',
    title: 'มิติสัมพันธ์',
    desc: 'การหมุน–สะท้อนภาพ อนุกรมภาพ นับลูกบาศก์ และทิศทาง',
    icon: 'cube',
    color: '#C2410C',
    color2: '#FDBA74',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 100,
    file: '11CyixZgNB1oCCK7DQ2Vh6uoDG9pH6-aS',
    topics: ['การหมุน/สะท้อนภาพ 28', 'อนุกรมภาพ 13', 'ภาพซ้อนทับ 15', 'นับลูกบาศก์ 15', 'พับกระดาษ–กล่อง 8', 'ทิศทาง 8', 'เชิงคำบรรยาย 13'],
    questions: part14,
  },
  {
    id: '1-5',
    label: '1.5',
    group: 'aptitude',
    title: 'ภาษาอังกฤษ',
    desc: 'Vocabulary, Grammar, Error Identification และ Reading',
    icon: 'globe',
    color: '#0369A1',
    color2: '#7DD3FC',
    minutes: 70,
    officialCount: 100,
    officialMinutes: 100,
    file: '1wBlxul9ijFX_S33OV3VNMDw3obKDOJ9e',
    topics: ['Vocabulary 20', 'Structure & Grammar 30', 'Error Identification 12', 'Conversation 8', 'Reading 30'],
    questions: part15,
  },
  {
    id: '2',
    label: '2',
    group: 'detail',
    title: 'ความละเอียดแม่นยำ',
    desc: 'ตรวจสอบข้อมูล ตัวเลข และรายละเอียดที่แตกต่างอย่างรวดเร็ว',
    icon: 'target',
    color: '#E11D48',
    color2: '#FDA4AF',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 50,
    file: '1yyNSVKclly5RgXlHpoZheQSoeKph4_BN',
    topics: ['เปรียบเทียบตัวเลข–ตัวอักษร', 'ตรวจทานเอกสาร', 'นับจำนวน', 'เรียงลำดับ', 'จับคู่ความเหมือน'],
    questions: part2,
  },
  {
    id: '3-1',
    label: '3.1',
    group: 'knowledge',
    title: 'หลักการบัญชี',
    desc: 'สมการบัญชี งบทดลอง ค่าเสื่อมราคา และงบการเงิน',
    icon: 'ledger',
    color: '#0B3B8C',
    color2: '#6EA8FE',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 100,
    file: '1jSB0ANlg8lKQY12luDkXVYxyrZ2XBfIX',
    topics: ['สมการบัญชี', 'การบันทึกบัญชี', 'งบทดลอง', 'ค่าเสื่อมราคา', 'เกณฑ์คงค้าง', 'งบการเงิน', 'งบกระแสเงินสด'],
    questions: part31,
  },
  {
    id: '3-2',
    label: '3.2',
    group: 'knowledge',
    title: 'การเงินการธนาคาร',
    desc: 'ดอกเบี้ย สินเชื่อ หลักประกัน ระบบชำระเงิน และสภาพคล่อง',
    icon: 'bank',
    color: '#1E40AF',
    color2: '#93C5FD',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 100,
    file: '1VMqSuwzocAwboHoC9S8WlrSiVV7yWXgC',
    topics: ['ส่วนต่างดอกเบี้ย', 'ธปท.', 'สถาบันการเงินเฉพาะกิจ', 'LTV–หลักประกัน', 'เช็ค', 'พร้อมเพย์', 'เงินฝาก', 'ดอกเบี้ยทบต้น'],
    questions: part32,
  },
  {
    id: '3-3',
    label: '3.3',
    group: 'knowledge',
    title: 'เศรษฐศาสตร์',
    desc: 'อุปสงค์–อุปทาน เงินเฟ้อ นโยบายการเงินการคลัง และ BCE',
    icon: 'chart',
    color: '#0891B2',
    color2: '#67E8F9',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 100,
    file: '1TZVmSS-0kjBi8eIWQqHKN6FJQhC95aM7',
    topics: ['อุปสงค์–อุปทาน', 'เงินเฟ้อ', 'GDP', 'นโยบายการเงิน', 'นโยบายการคลัง', 'ความยืดหยุ่น', 'ค่าเสียโอกาส', 'BCG'],
    questions: part33,
  },
  {
    id: '3-4',
    label: '3.4',
    group: 'knowledge',
    title: 'สินเชื่อและพัฒนาชนบท',
    desc: 'หลัก 5C, DSR, NPL, หลักประกัน และแหล่งทุนชุมชน',
    icon: 'loan',
    color: '#047857',
    color2: '#6EE7B7',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 100,
    file: '18_Y3pioXouro8aOt9ZdsuWxmVSLlC4Ou',
    topics: ['5C', 'DSR', 'NPL', 'หลักประกัน', 'กระแสเงินสด', 'กองทุนหมู่บ้าน', 'สหกรณ์', 'ติดตามหนี้', 'ความเสี่ยงเครดิต'],
    questions: part34,
  },
  {
    id: '3-5',
    label: '3.5',
    group: 'knowledge',
    title: 'การตลาด',
    desc: '4P, STP, CRM, Customer Insight และการขายเชิงให้คำปรึกษา',
    icon: 'cart',
    color: '#1d4ed8',
    color2: '#93c5fd',
    minutes: 60,
    officialCount: 100,
    officialMinutes: 100,
    file: '1nb1hKxHlz1QpilabRhOa-h3HeyYFGTf5',
    topics: ['4P/7P', 'STP', 'CRM', 'Customer Insight', 'Consultative Selling', 'Digital Marketing', 'Brand Equity', 'PLC'],
    questions: part35,
  },
]

export const GROUPS = [
  {
    key: 'aptitude',
    label: 'ความสามารถทั่วไป',
    desc: 'พาร์ท 1.1 – 1.5 · ด้านละ 100 ข้อ 100 คะแนน',
  },
  { key: 'detail', label: 'ความละเอียดแม่นยำ', desc: 'พาร์ท 2 · 100 ข้อ 50 คะแนน' },
  {
    key: 'knowledge',
    label: 'ความรู้ความสามารถเฉพาะตำแหน่ง',
    desc: 'พาร์ท 3.1 – 3.5 · ด้านละ 100 ข้อ 100 คะแนน',
  },
]

/* ---------- Mock Exam 30 ข้อ (สุ่มแบบกำหนดได้จากทุกพาร์ท) ---------- */
const pick = (arr, n) => arr.slice(0, n)

export const MOCK_QUESTIONS = [
  ...pick(part11, 3).map((q) => ({ ...q, part: '1.1 คณิตศาสตร์' })),
  ...pick(part12, 3).map((q) => ({ ...q, part: '1.2 วิเคราะห์และเหตุผล' })),
  ...pick(part13, 3).map((q) => ({ ...q, part: '1.3 ภาษาไทย' })),
  ...pick(part14, 3).map((q) => ({ ...q, part: '1.4 มิติสัมพันธ์' })),
  ...pick(part15, 3).map((q) => ({ ...q, part: '1.5 ภาษาอังกฤษ' })),
  ...pick(part2, 3).map((q) => ({ ...q, part: '2 ความละเอียดแม่นยำ' })),
  ...pick(part31, 3).map((q) => ({ ...q, part: '3.1 หลักการบัญชี' })),
  ...pick(part32, 3).map((q) => ({ ...q, part: '3.2 การเงินการธนาคาร' })),
  ...pick(part33, 3).map((q) => ({ ...q, part: '3.3 เศรษฐศาสตร์' })),
  ...pick(part34, 3).map((q) => ({ ...q, part: '3.4 สินเชื่อและพัฒนาชนบท' })),
]

export const MOCK_PART = {
  id: 'mock',
  label: 'MOCK',
  group: 'mock',
  title: 'Mock Exam รวมทุกพาร์ท',
  desc: 'จำลองการสอบจริง 30 ข้อจากทุกพาร์ท นับเวลาสะสมต่อเนื่อง ไม่จำกัดเวลา',
  icon: 'trophy',
  color: '#0B2149',
  color2: '#2563EB',
  minutes: 35,
  officialCount: 230,
  officialMinutes: 250,
  file: '1Ke0jdg_g4H3AoDvQ5P9iyBHw72uKDwnm',
  topics: ['คละทุกพาร์ท 1.1 – 3.5', 'นับเวลาสะสม ไม่จำกัดเวลา', 'คิดคะแนนรวม'],
  questions: MOCK_QUESTIONS,
}

/* รวมข้อสอบที่ผู้นำเข้าจากไฟล์ DOCX/PDF เพิ่มเข้าคลังของแต่ละพาร์ท */
try {
  PARTS.forEach((part) => {
    const extra = importedQuestions(part.id)
    if (!extra.length) return
    const seen = new Set(part.questions.map((q) => q.q))
    const merged = [...part.questions]
    extra.forEach((q) => {
      if (q?.q && !seen.has(q.q)) {
        seen.add(q.q)
        merged.push(q)
      }
    })
    part.questions = merged
  })
} catch {
  /* localStorage อาจถูกปิด — ใช้คลังมาตรฐาน */
}

export const ALL_PARTS = [...PARTS, MOCK_PART]

export const getPart = (id) => ALL_PARTS.find((p) => p.id === id)

export const TOTAL_QUESTIONS = PARTS.reduce((s, p) => s + p.questions.length, 0)
