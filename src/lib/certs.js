/* ============================================================
   Certificates — เกียรติบัตรประจำพาร์ท
   ผ่านเกณฑ์เมื่อทำครบพาร์ทใหญ่ 100% (เต็มพาร์ท หรือครบทุกชุดมินิ)
   และได้คะแนนรวม >= 60% (ระดับเหรียญตามคะแนน)
   เกียรติบัตรคำนวณมาจากประวัติผลสอบ (results) เสมอ
   ไม่เก็บข้อมูลเพิ่ม → ซิงก์ GitHub/ย้ายเครื่องแล้วตามไปด้วยอัตโนมัติ
   ============================================================ */

import { computePartCompletion } from './completion.js'

export const PASS_SCORE = 60

export function certTier(score) {
  if (score >= 85) return { key: 'gold', medal: '🥇', label: 'เกียรติบัตรระดับทอง', word: 'ยอดเยี่ยม' }
  if (score >= 75) return { key: 'silver', medal: '🥈', label: 'เกียรติบัตรระดับเงิน', word: 'ดีมาก' }
  return { key: 'bronze', medal: '🥉', label: 'เกียรติบัตรระดับทองแดง', word: 'ผ่านเกณฑ์' }
}

/**
 * คืนอาร์เรย์เกียรติบัตรที่ได้รับ 1 ใบต่อวิชาย่อย (พาร์ท)
 * จะได้รับเมื่อทำพาร์ทใหญ่ครบ 100% และคะแนนดีที่สุด/คะแนนรวม >= 60%
 */
export function certificatesFromResults(results = []) {
  const safe = Array.isArray(results) ? results : []
  const partIds = new Set()
  safe.forEach((r) => {
    if (r && r.kind !== 'set' && r.partId) partIds.add(r.partId)
  })

  const certs = []
  for (const partId of partIds) {
    const comp = computePartCompletion(partId, safe, PASS_SCORE)
    if (!comp.isComplete || !(comp.bestScore >= PASS_SCORE) || !comp.bestResult) continue
    const r = comp.bestResult
    const tier = certTier(comp.bestScore)
    certs.push({
      key: `cert:${partId}`,
      partId,
      partLabel: r.partLabel,
      partTitle: r.partTitle,
      partColor: r.partColor || '#2563EB',
      score: comp.bestScore,
      correct: comp.bestCorrect ?? r.correct,
      total: comp.totalQuestions || r.total,
      name: r.name || '',
      date: r.date,
      earnedDate: comp.firstPassDate || r.date,
      resultId: r.id,
      ...tier,
    })
  }

  return certs.sort((a, b) => new Date(a.earnedDate) - new Date(b.earnedDate))
}

/** เกียรติบัตรของพาร์ทเดียว (ถ้าทำครบ 100% และผ่านเกณฑ์แล้ว) */
export function certificateForPart(partId, results = []) {
  return certificatesFromResults(results).find((c) => c.partId === partId) || null
}
