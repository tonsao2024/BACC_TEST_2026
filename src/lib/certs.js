/* ============================================================
   Certificates — เกียรติบัตรประจำพาร์ท
   ผ่านเกณฑ์เมื่อคะแนน >= 60% (รอบจริง ระดับเหรียญตามคะแนน)
   เกียรติบัตรคำนวณมาจากประวัติผลสอบ (results) เสมอ
   ไม่เก็บข้อมูลเพิ่ม → ซิงก์ GitHub/ย้ายเครื่องแล้วตามไปด้วยอัตโนมัติ
   ============================================================ */

export const PASS_SCORE = 60

export function certTier(score) {
  if (score >= 85) return { key: 'gold', medal: '🥇', label: 'เกียรติบัตรระดับทอง', word: 'ยอดเยี่ยม' }
  if (score >= 75) return { key: 'silver', medal: '🥈', label: 'เกียรติบัตรระดับเงิน', word: 'ดีมาก' }
  return { key: 'bronze', medal: '🥉', label: 'เกียรติบัตรระดับทองแดง', word: 'ผ่านเกณฑ์' }
}

/**
 * คืนอาร์เรย์เกียรติบัตรที่ได้รับ 1 ใบต่อวิชาย่อย (พาร์ท)
 * เลือกจากผลที่ดีที่สุดที่ผ่านเกณฑ์ เรียงตามวันที่ผ่านครั้งแรก
 */
export function certificatesFromResults(results = []) {
  const firstPass = new Map()
  const best = new Map()
  results.forEach((r) => {
    if (!r || r.kind === 'set' || !r.partId || !(r.score >= PASS_SCORE)) return
    const prevFirst = firstPass.get(r.partId)
    if (!prevFirst || new Date(r.date) < new Date(prevFirst.date)) firstPass.set(r.partId, r)
    const prevBest = best.get(r.partId)
    if (!prevBest || r.score > prevBest.score) best.set(r.partId, r)
  })
  return [...best.values()]
    .map((r) => {
      const tier = certTier(r.score)
      const first = firstPass.get(r.partId)
      return {
        key: `cert:${r.partId}`,
        partId: r.partId,
        partLabel: r.partLabel,
        partTitle: r.partTitle,
        partColor: r.partColor || '#2563EB',
        score: r.score,
        correct: r.correct,
        total: r.total,
        name: r.name || '',
        date: r.date,
        earnedDate: first?.date || r.date,
        resultId: r.id,
        ...tier,
      }
    })
    .sort((a, b) => new Date(a.earnedDate) - new Date(b.earnedDate))
}

/** เกียรติบัตรของพาร์ทเดียว (ถ้าเคยผ่าน) */
export function certificateForPart(partId, results = []) {
  return certificatesFromResults(results).find((c) => c.partId === partId) || null
}
