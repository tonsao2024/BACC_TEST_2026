import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPart, PARTS } from '../src/data/index.js'

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
    const subset20 = part.questions.slice(0, 20)
    assert.equal(subset20.length, 20)
  })
})
