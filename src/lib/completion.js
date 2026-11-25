/* ============================================================
   Part & Mini-Batch Completion Engine
   ------------------------------------------------------------
   แนวคิดสำคัญ:
   - การแบ่งทำทีละ 10 / 20 / 50 ข้อ (มินิชุดย่อย) มีไว้เพื่อให้ผู้เข้าสอบทยอยฝึก
     อย่างมีกำลังใจ ไม่ต้องทำรวดเดียวทั้งพาร์ท
   - การทำมินิชุดเดียวจะไม่นับว่าจบพาร์ทใหญ่ 100%
   - พาร์ทใหญ่จะครบ 100% (isComplete = true) ก็ต่อเมื่อ:
     (1) ทำข้อสอบครบทุกชุดย่อยจนครอบคลุมครบทุกข้อของพาร์ทใหญ่ หรือ
     (2) เลือกทำแบบ "ทั้งหมด" ครบทั้งพาร์ทใหญ่
   ============================================================ */

import { getPart } from '../data/index.js'

const questionMapCache = new WeakMap()

function getQuestionIndexMap(part) {
  if (!part || !Array.isArray(part.questions)) return new Map()
  let map = questionMapCache.get(part)
  if (!map) {
    map = new Map()
    part.questions.forEach((q, idx) => {
      if (q?.q && !map.has(q.q)) map.set(q.q, idx)
    })
    questionMapCache.set(part, map)
  }
  return map
}

function getScopedIndices(part, sectionKeys) {
  const N = part?.questions?.length || 0
  if (!Array.isArray(sectionKeys) || sectionKeys.length === 0) {
    return Array.from({ length: N }, (_, i) => i)
  }
  const allowed = new Set(sectionKeys)
  const out = []
  for (let i = 0; i < N; i += 1) {
    if (allowed.has(part.questions[i]?.sectionKey)) out.push(i)
  }
  return out.length > 0 ? out : Array.from({ length: N }, (_, i) => i)
}

/**
 * คืนรายการ index (0..N-1) ของข้อสอบในพาร์ทใหญ่ที่ผลการสอบ r ครอบคลุมจริง
 */
export function resolveResultCoveredIndices(part, r) {
  const N = part?.questions?.length || 0
  if (!N || !r) return []

  if (Array.isArray(r.partQuestionIndices) && r.partQuestionIndices.length > 0) {
    const seen = new Set()
    const valid = []
    for (const idx of r.partQuestionIndices) {
      if (Number.isInteger(idx) && idx >= 0 && idx < N && !seen.has(idx)) {
        seen.add(idx)
        valid.push(idx)
      }
    }
    if (valid.length > 0) return valid
  }

  const hasSectionFilter = Array.isArray(r.sectionKeys) && r.sectionKeys.length > 0
  const isAllSubset = !r.subsetCount || r.subsetCount === 'all'
  const isFullTotal = typeof r.total !== 'number' || r.total >= N

  if (isAllSubset && !hasSectionFilter && isFullTotal) {
    return Array.from({ length: N }, (_, i) => i)
  }

  if (Array.isArray(r.items) && r.items.length > 0) {
    const qMap = getQuestionIndexMap(part)
    const seen = new Set()
    const matched = []
    for (const item of r.items) {
      const idx = item?.q ? qMap.get(item.q) : undefined
      if (idx !== undefined && !seen.has(idx)) {
        seen.add(idx)
        matched.push(idx)
      }
    }
    if (matched.length > 0) return matched
  }

  const pool = getScopedIndices(part, r.sectionKeys)
  if (isAllSubset) {
    if (typeof r.total === 'number' && r.total > 0 && r.total < pool.length) {
      return pool.slice(0, r.total)
    }
    return pool
  }

  const count = Math.max(1, Math.min(Number(r.subsetCount) || pool.length, pool.length))
  if (r.batchIndex === 'random') {
    const seed = String(r.subsetSeed || r.id || '0')
    const ch0 = seed.charCodeAt(0) || 48
    const indexed = pool.map((origIdx, localIdx) => ({
      origIdx,
      h: (localIdx * 16807 + ch0 * 31) % 2147483647,
    }))
    indexed.sort((a, b) => a.h - b.h)
    return indexed.slice(0, count).map((x) => x.origIdx)
  }

  const bIdx = typeof r.batchIndex === 'number' && r.batchIndex >= 0 ? r.batchIndex : 0
  const start = bIdx * count
  const end = Math.min(pool.length, start + count)
  return pool.slice(start, end)
}

/**
 * ตรวจว่าผลสอบ r เดี่ยวๆ เป็นการทำครบเต็มพาร์ทใหญ่ในครั้งเดียวหรือไม่
 */
export function isFullPartResult(r, partOrId = null) {
  if (!r || r.kind === 'set' || !r.partId) return false
  const part = typeof partOrId === 'string' ? getPart(partOrId) : partOrId || getPart(r.partId)
  if (!part) {
    return !r.subsetCount || r.subsetCount === 'all'
  }
  const indices = resolveResultCoveredIndices(part, r)
  return indices.length >= part.questions.length
}

/**
 * คำนวณความคืบหน้าและสถานะจบ 100% ของพาร์ทใหญ่จากประวัติผลสอบทั้งหมด
 */
export function computePartCompletion(partOrId, results = [], passScore = 60) {
  const part = typeof partOrId === 'string' ? getPart(partOrId) : partOrId
  const partId = part?.id || (typeof partOrId === 'string' ? partOrId : null)
  const rows = (Array.isArray(results) ? results : []).filter(
    (r) => r && r.kind !== 'set' && r.partId === partId,
  )

  if (!part) {
    const fullRows = rows.filter((r) => !r.subsetCount || r.subsetCount === 'all')
    const bestFull = fullRows.length
      ? fullRows.reduce((b, r) => (r.score > b.score ? r : b), fullRows[0])
      : null
    const passFull = fullRows
      .filter((r) => r.score >= passScore)
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    return {
      partId,
      attempted: rows.length > 0,
      attemptsCount: rows.length,
      totalQuestions: bestFull?.total || 0,
      coveredCount: bestFull ? bestFull.total || 0 : 0,
      remainingCount: 0,
      completionPct: bestFull ? 100 : rows.length > 0 ? 50 : 0,
      isComplete: Boolean(bestFull),
      bestScore: bestFull ? bestFull.score : null,
      bestCorrect: bestFull ? bestFull.correct : null,
      partialAvgScore: rows.length
        ? Math.round((rows.reduce((s, r) => s + (Number(r.score) || 0), 0) / rows.length) * 10) / 10
        : null,
      bestResult: bestFull,
      firstPassDate: passFull[0]?.date || bestFull?.date || null,
      coveredMask: null,
      bestScoreAt: null,
    }
  }

  const N = part.questions.length
  const coveredMask = new Uint8Array(N)
  const bestScoreAt = new Float64Array(N).fill(-1)

  if (!rows.length || N === 0) {
    return {
      partId,
      attempted: false,
      attemptsCount: 0,
      totalQuestions: N,
      coveredCount: 0,
      remainingCount: N,
      completionPct: 0,
      isComplete: false,
      bestScore: null,
      bestCorrect: null,
      partialAvgScore: null,
      bestResult: null,
      firstPassDate: null,
      coveredMask,
      bestScoreAt,
    }
  }

  const chronological = [...rows].sort(
    (a, b) => new Date(a.date || 0) - new Date(b.date || 0),
  )

  let coveredCount = 0
  let bestFullRun = null
  let firstCompleteDate = null
  let firstPassDate = null
  let latestCompleteRow = null

  for (const r of chronological) {
    const score = Number(r.score) || 0
    const indices = resolveResultCoveredIndices(part, r)
    if (indices.length >= N) {
      if (!bestFullRun || score > bestFullRun.score) bestFullRun = r
    }
    for (const idx of indices) {
      if (coveredMask[idx] === 0) {
        coveredMask[idx] = 1
        coveredCount += 1
      }
      if (score > bestScoreAt[idx]) {
        bestScoreAt[idx] = score
      }
    }

    if (coveredCount >= N) {
      if (!firstCompleteDate) firstCompleteDate = r.date
      latestCompleteRow = r
      if (!firstPassDate) {
        let sumNow = 0
        for (let i = 0; i < N; i += 1) sumNow += Math.max(0, bestScoreAt[i])
        const combinedNow = Math.round((sumNow / N) * 10) / 10
        const effNow = Math.max(combinedNow, bestFullRun?.score ?? 0)
        if (effNow >= passScore) firstPassDate = r.date
      }
    }
  }

  let coveredScoreSum = 0
  for (let i = 0; i < N; i += 1) {
    if (coveredMask[i] === 1) coveredScoreSum += Math.max(0, bestScoreAt[i])
  }

  const isComplete = coveredCount >= N
  const completionPct = isComplete
    ? 100
    : coveredCount === 0
      ? 0
      : Math.max(1, Math.min(99, Math.round((coveredCount / N) * 100)))

  const partialAvgScore =
    coveredCount > 0 ? Math.round((coveredScoreSum / coveredCount) * 10) / 10 : null

  let bestScore = null
  let bestCorrect = null
  let bestResult = null

  if (isComplete) {
    const combinedScore = Math.round((coveredScoreSum / N) * 10) / 10
    if (bestFullRun && bestFullRun.score >= combinedScore) {
      bestScore = bestFullRun.score
      bestCorrect = bestFullRun.correct ?? Math.round((bestFullRun.score / 100) * N)
      bestResult = bestFullRun
    } else {
      bestScore = combinedScore
      bestCorrect = Math.round((combinedScore / 100) * N)
      const refRow = latestCompleteRow || rows[0]
      bestResult = {
        id: refRow?.id || `complete:${part.id}`,
        kind: 'part',
        partId: part.id,
        partLabel: part.label || refRow?.partLabel,
        partTitle: part.title || refRow?.partTitle,
        partColor: part.color || refRow?.partColor || '#2563EB',
        score: bestScore,
        correct: bestCorrect,
        total: N,
        date: refRow?.date || firstCompleteDate,
        name: refRow?.name || '',
        combinedFromBatches: true,
      }
    }
  }

  return {
    partId,
    attempted: true,
    attemptsCount: rows.length,
    totalQuestions: N,
    coveredCount,
    remainingCount: Math.max(0, N - coveredCount),
    completionPct,
    isComplete,
    bestScore,
    bestCorrect,
    partialAvgScore,
    bestResult,
    firstCompleteDate,
    firstPassDate,
    coveredMask,
    bestScoreAt,
  }
}

/**
 * คำนวณความคืบหน้าของแต่ละชุดย่อย (เช่น ชุดที่ 1..10 สำหรับโหมด 10 ข้อ)
 */
export function getBatchProgress(partOrId, results = [], batchSize = 10, sectionKeys = []) {
  const part = typeof partOrId === 'string' ? getPart(partOrId) : partOrId
  if (!part || !batchSize || batchSize === 'all') {
    return { batches: [], doneBatches: 0, totalBatches: 1, nextBatchIndex: 0, scopeCompletionPct: 0 }
  }

  const completion = computePartCompletion(part, results)
  const pool = getScopedIndices(part, sectionKeys)
  const totalCount = pool.length
  const size = Number(batchSize)
  const totalBatches = Math.max(1, Math.ceil(totalCount / size))
  const rows = (Array.isArray(results) ? results : []).filter(
    (r) => r && r.kind !== 'set' && r.partId === part.id,
  )

  let coveredInPool = 0
  for (const idx of pool) {
    if (completion.coveredMask?.[idx] === 1) coveredInPool += 1
  }

  const batches = []
  let doneBatches = 0
  let nextBatchIndex = null

  for (let i = 0; i < totalBatches; i += 1) {
    const startLocal = i * size
    const endLocal = Math.min(totalCount, (i + 1) * size)
    const slice = pool.slice(startLocal, endLocal)
    const done = slice.length > 0 && slice.every((idx) => completion.coveredMask?.[idx] === 1)
    if (done) doneBatches += 1
    else if (nextBatchIndex === null) nextBatchIndex = i

    const directRuns = rows.filter((r) => {
      if (Number(r.subsetCount) !== size || r.batchIndex !== i) return false
      const rSec = Array.isArray(r.sectionKeys) ? r.sectionKeys : []
      if (sectionKeys.length === 0) return rSec.length === 0
      return rSec.length === sectionKeys.length && sectionKeys.every((k) => rSec.includes(k))
    })

    let bestScore = null
    if (directRuns.length > 0) {
      bestScore = Math.max(...directRuns.map((r) => Number(r.score) || 0))
    } else if (done && slice.length > 0) {
      const sum = slice.reduce((s, idx) => s + Math.max(0, completion.bestScoreAt?.[idx] ?? 0), 0)
      bestScore = Math.round((sum / slice.length) * 10) / 10
    }

    batches.push({
      index: i,
      label: `ชุดที่ ${i + 1}`,
      range: `ข้อ ${startLocal + 1}–${endLocal}`,
      count: slice.length,
      start: startLocal + 1,
      end: endLocal,
      done,
      bestScore,
      attemptsCount: directRuns.length,
    })
  }

  const isScopeComplete = totalCount > 0 && coveredInPool >= totalCount
  const scopeCompletionPct = isScopeComplete
    ? 100
    : coveredInPool === 0
      ? 0
      : Math.max(1, Math.min(99, Math.round((coveredInPool / totalCount) * 100)))

  return {
    batches,
    doneBatches,
    totalBatches,
    nextBatchIndex: nextBatchIndex ?? 0,
    coveredInPool,
    totalInPool: totalCount,
    scopeCompletionPct,
  }
}

/**
 * สรุปภาพรวมความคืบหน้าของรายการพาร์ทหลักทั้งหมด (เช่น PARTS 11 พาร์ท)
 */
export function computeOverallPartsProgress(parts = [], results = []) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return { completedPartsCount: 0, startedPartsCount: 0, overallProgressPct: 0, byPartId: {} }
  }
  let completedPartsCount = 0
  let startedPartsCount = 0
  let sumPct = 0
  const byPartId = {}

  for (const part of parts) {
    const comp = computePartCompletion(part, results)
    byPartId[part.id] = comp
    if (comp.isComplete) completedPartsCount += 1
    if (comp.attempted) startedPartsCount += 1
    sumPct += comp.completionPct
  }

  const allComplete = completedPartsCount >= parts.length
  const rawAvg = Math.round(sumPct / parts.length)
  const overallProgressPct = allComplete
    ? 100
    : sumPct === 0
      ? 0
      : Math.max(1, Math.min(99, rawAvg))

  return {
    completedPartsCount,
    startedPartsCount,
    overallProgressPct,
    byPartId,
  }
}
