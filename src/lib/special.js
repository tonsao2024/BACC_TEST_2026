/* ตัวช่วยสำหรับพาร์ท "ข้อสอบพิเศษ" — คีย์ของชุดข้อสอบต้องแยกตามรายวิชาย่อยที่เลือก
   เพื่อให้การทำค้างไว้/ประวัติของแต่ละวิชาไม่ทับกัน */

export const normalizeSectionKeys = (part, sectionKeys) => {
  const all = (part?.sections || []).map((s) => s.key)
  const picked = (sectionKeys || []).filter((k) => all.includes(k))
  if (!picked.length || picked.length === all.length) return []
  return all.filter((k) => picked.includes(k))
}

/** '' เมื่อเลือกครบทุกวิชา, ':sec:a+b' เมื่อเลือกบางวิชา */
export const sectionKeySuffix = (part, sectionKeys) => {
  const keys = normalizeSectionKeys(part, sectionKeys)
  return keys.length ? `:sec:${keys.join('+')}` : ''
}

/** คีย์หลักของพาร์ท (ใช้ร่วมกับ buildPartExam ใน App.jsx และหน้า PartDetail) */
export const partBaseKey = (partId, part, sectionKeys) =>
  `part:${partId}${sectionKeySuffix(part, sectionKeys)}`

/** สร้าง sections สำหรับ Quiz (เฉพาะที่มีข้ออยู่ในชุดที่เลือก) */
export const sectionsForQuestions = (part, questions) => {
  if (!part?.sections?.length) return null
  const rows = part.sections
    .map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      points: s.points || part.officialPoints || questions.length,
      count: questions.filter((q) => q.sectionKey === s.key).length,
    }))
    .filter((s) => s.count > 0)
  return rows.length > 1 ? rows : null
}
