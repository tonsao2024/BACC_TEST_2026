import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EXTRA_GROUP, EXTRA_PARTS, getPart, PARTS } from '../src/data/index.js'
import {
  computeOverallPartsProgress,
  computePartCompletion,
  getBatchProgress,
} from '../src/lib/completion.js'
import { certificatesFromResults } from '../src/lib/certs.js'
import { computePublicStats } from '../src/lib/friends.js'

test('part has 100 questions and can be chunked into 10, 20, or 50 questions', () => {
  const p = getPart('1-1')
  assert.equal(p.questions.length, 100)

  // Chunking 10 questions: 10 batches
  const batch10 = Array.from({ length: 10 }, (_, i) => p.questions.slice(i * 10, (i + 1) * 10))
  assert.equal(batch10.length, 10)
  assert.equal(batch10[0].length, 10)
  assert.equal(batch10[9].length, 10)
  // Ensure no overlap between batches
  assert.equal(batch10[0][9], p.questions[9])
  assert.equal(batch10[1][0], p.questions[10])

  // Chunking 20 questions: 5 batches
  const batch20 = Array.from({ length: 5 }, (_, i) => p.questions.slice(i * 20, (i + 1) * 20))
  assert.equal(batch20.length, 5)
  assert.equal(batch20[0].length, 20)
  assert.equal(batch20[4].length, 20)
  assert.equal(batch20[0][19], p.questions[19])
  assert.equal(batch20[1][0], p.questions[20])

  // Chunking 50 questions: 2 batches (ครึ่งแรก / ครึ่งหลัง)
  const batch50 = Array.from({ length: 2 }, (_, i) => p.questions.slice(i * 50, (i + 1) * 50))
  assert.equal(batch50.length, 2)
  assert.equal(batch50[0].length, 50)
  assert.equal(batch50[1].length, 50)
  assert.equal(batch50[0][0], p.questions[0])
  assert.equal(batch50[1][0], p.questions[50])
})

test('every part in PARTS supports question subset modes', () => {
  PARTS.forEach((part) => {
    assert.ok(part.questions.length >= 30, `Part ${part.id} has ${part.questions.length} questions`)
    const subset10 = part.questions.slice(0, 10)
    assert.equal(subset10.length, 10)
    const subset20 = part.questions.slice(20, 40)
    assert.equal(subset20.length, 20)
  })
})

test('completing a single mini-batch does NOT count as 100% completion of the main part', () => {
  const oneMini10 = [
    {
      id: 'm1',
      kind: 'part',
      partId: '1-1',
      partLabel: '1.1',
      partTitle: 'คณิตศาสตร์',
      subsetCount: 10,
      batchIndex: 0,
      score: 90,
      correct: 9,
      total: 10,
      date: '2026-11-25T01:00:00Z',
    },
  ]

  const comp = computePartCompletion('1-1', oneMini10)
  assert.equal(comp.attempted, true)
  assert.equal(comp.isComplete, false)
  assert.equal(comp.coveredCount, 10)
  assert.equal(comp.totalQuestions, 100)
  assert.equal(comp.completionPct, 10)
  assert.equal(comp.bestScore, null)

  const bp = getBatchProgress('1-1', oneMini10, 10)
  assert.equal(bp.doneBatches, 1)
  assert.equal(bp.totalBatches, 10)
  assert.equal(bp.nextBatchIndex, 1)
  assert.equal(bp.batches[0].done, true)
  assert.equal(bp.batches[1].done, false)

  const overall = computeOverallPartsProgress(PARTS, oneMini10)
  assert.equal(overall.completedPartsCount, 0)
  assert.equal(overall.startedPartsCount, 1)
  assert.ok(overall.overallProgressPct < 100)

  // No full-part certificate and no passedParts inflation from a single mini-batch
  assert.equal(certificatesFromResults(oneMini10).length, 0)
  assert.equal(computePublicStats(oneMini10).passedParts, 0)
})

test('completing ALL mini-batches of a main part reaches 100% completion and unlocks pass status', () => {
  // Complete all 10 mini-batches of 10 questions (0..9) on Part 1-1
  const allTenBatches = Array.from({ length: 10 }, (_, bIdx) => ({
    id: `m-${bIdx}`,
    kind: 'part',
    partId: '1-1',
    partLabel: '1.1',
    partTitle: 'คณิตศาสตร์',
    subsetCount: 10,
    batchIndex: bIdx,
    score: 80,
    correct: 8,
    total: 10,
    date: `2026-11-25T0${Math.min(9, bIdx)}:00:00Z`,
  }))

  // With only 9/10 batches done, still 90% and NOT complete
  const nineDone = computePartCompletion('1-1', allTenBatches.slice(0, 9))
  assert.equal(nineDone.isComplete, false)
  assert.equal(nineDone.completionPct, 90)
  assert.equal(certificatesFromResults(allTenBatches.slice(0, 9)).length, 0)

  // With all 10/10 batches done, reaches 100% complete!
  const allDone = computePartCompletion('1-1', allTenBatches)
  assert.equal(allDone.isComplete, true)
  assert.equal(allDone.coveredCount, 100)
  assert.equal(allDone.completionPct, 100)
  assert.equal(allDone.bestScore, 80)

  const overall = computeOverallPartsProgress(PARTS, allTenBatches)
  assert.equal(overall.completedPartsCount, 1)

  const certs = certificatesFromResults(allTenBatches)
  assert.equal(certs.length, 1)
  assert.equal(certs[0].partId, '1-1')
  assert.equal(certs[0].score, 80)
  assert.equal(computePublicStats(allTenBatches).passedParts, 1)

  // Also test completing all 5 batches of 20 questions on Part 1-2
  const allFive20 = Array.from({ length: 5 }, (_, bIdx) => ({
    id: `m20-${bIdx}`,
    kind: 'part',
    partId: '1-2',
    partLabel: '1.2',
    partTitle: 'วิเคราะห์และเหตุผล',
    subsetCount: 20,
    batchIndex: bIdx,
    score: 75,
    correct: 15,
    total: 20,
    date: `2026-11-25T1${bIdx}:00:00Z`,
  }))
  const comp20 = computePartCompletion('1-2', allFive20)
  assert.equal(comp20.isComplete, true)
  assert.equal(comp20.completionPct, 100)
  assert.equal(comp20.bestScore, 75)
})

test('expanded practice sets (EXTRA_PARTS) are valid and contain zero source/copyright attribution', () => {
  assert.equal(EXTRA_PARTS.length, 6)
  const totalExtra = EXTRA_PARTS.reduce((sum, p) => sum + p.questions.length, 0)
  assert.ok(totalExtra >= 500, `Expected >= 500 extra questions, got ${totalExtra}`)

  const forbidden = new RegExp(
    [
      '\\u0e04\\u0e39\\u0e48\\u0e21\\u0e37\\u0e2d\\u0e2a\\u0e2d\\u0e1a',
      'the\\s*best\\s*center',
      'ebook',
      '\\u0e1b\\u0e35\\s*63',
      '\\.pdf',
    ].join('|'),
    'i',
  )
  assert.ok(!forbidden.test(`${EXTRA_GROUP.label} ${EXTRA_GROUP.desc}`))

  for (const part of EXTRA_PARTS) {
    assert.equal(part.file, null)
    assert.equal(part.sourceFile, null)
    assert.ok(!forbidden.test(`${part.title} ${part.desc}`))
    assert.ok(part.questions.length >= 60, `${part.id} should have >= 60 questions`)
    for (const q of part.questions) {
      assert.equal(q.o.length, 4)
      assert.equal(new Set(q.o).size, 4)
      assert.ok(q.a >= 0 && q.a <= 3)
      assert.ok(q.e && q.e.length >= 10)
      assert.ok(!forbidden.test(`${q.q} ${q.o.join(' ')} ${q.e}`), `Forbidden text in ${part.id}`)
    }
  }
})
