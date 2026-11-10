import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DRIVE_FOLDER_URL, DRIVE_OUTPUT_FOLDER_URL, SOURCE_FILES, SOURCE_GROUPS, PARTS, MOCK_PART } from '../src/data/index.js'

test('verified Drive files are grouped and every exam points to a PDF', () => {
  assert.equal(DRIVE_FOLDER_URL, 'https://drive.google.com/drive/folders/1zcaLIPT0u6estLdIFIm-0PPyF2ACkh7f?usp=sharing')
  assert.equal(DRIVE_OUTPUT_FOLDER_URL, 'https://drive.google.com/drive/folders/1Gs9Qv1lBvJHuz0HvcjtExP5fE8us85uc')
  assert.equal(SOURCE_FILES.filter(f => f.type === 'PDF').length, 16)
  assert.equal(new Set(SOURCE_FILES.map(f => f.id)).size, SOURCE_FILES.length)
  const groups = new Set(SOURCE_GROUPS.map(g => g.id))
  assert.ok(SOURCE_FILES.every(f => groups.has(f.category)))
  assert.ok(SOURCE_GROUPS.every(g => SOURCE_FILES.some(f => f.category === g.id)))
  for (const part of [...PARTS, MOCK_PART]) assert.ok(SOURCE_FILES.some(f => f.id === part.file && f.type === 'PDF'), part.id)
  assert.equal(PARTS.find(p => p.id === '2').file, '1yyNSVKclly5RgXlHpoZheQSoeKph4_BN')
  assert.equal(SOURCE_FILES.find(f => f.category === 'notice').id, '1-prDA30BIW0GhXc91R2OO-nB7Oefzs_c')
})
