import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('index.html configures viewport-fit=cover without disabling user pinch zoom', () => {
  assert.match(html, /viewport-fit=cover/)
  assert.doesNotMatch(html, /user-scalable\s*=\s*no/i)
  assert.doesNotMatch(html, /maximum-scale\s*=\s*1(\.0)?\b/i)
})

test('.app shell avoids full-height backdrop-filter that exceeds iOS Retina GPU texture limits', () => {
  const baseAppMatch = css.match(/\/\* ---------- app shell ---------- \*\/\s*\.app\s*\{([^}]*)\}/)
  assert.ok(baseAppMatch, 'found base .app rule')
  assert.doesNotMatch(baseAppMatch[1], /backdrop-filter/)
  assert.match(baseAppMatch[1], /overflow-x:\s*clip/)
})

test('every dvh declaration has an immediate vh fallback for older iOS Safari', () => {
  const lines = css.split('\n')
  lines.forEach((line, i) => {
    if (/\d+dvh\b/.test(line)) {
      const prop = line.trim().split(':')[0]
      const prev = (lines[i - 1] || '').trim()
      assert.ok(
        prev.startsWith(`${prop}:`) && /\d+vh\b/.test(prev),
        `Line ${i + 1} (${line.trim()}) must be preceded by a ${prop}: ...vh fallback, got: "${prev}"`,
      )
    }
  })
})

test('color-mix() has a solid background fallback immediately preceding it', () => {
  const lines = css.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('color-mix(')) {
      const prev = (lines[i - 1] || '').trim()
      assert.match(prev, /^background:\s*var\(--pc/, `Line ${i + 1} missing solid background fallback before color-mix`)
    }
  })
})

test('safe-area insets and iOS 16px input no-zoom protection are present', () => {
  assert.match(css, /env\(safe-area-inset-top/)
  assert.match(css, /env\(safe-area-inset-bottom/)
  assert.match(css, /env\(safe-area-inset-left/)
  assert.match(css, /env\(safe-area-inset-right/)
  assert.match(css, /@media\s*\(max-width:\s*768px\),\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)[\s\S]*?font-size:\s*16px/)
})

test('responsive breakpoints cover iPhones (SE/mini/Pro Max/landscape), tablets, and popular computer screens', () => {
  assert.match(css, /@media\s*\(max-width:\s*359px\)/)
  assert.match(css, /@media\s*\(max-width:\s*380px\)/)
  assert.match(css, /@media\s*\(max-width:\s*430px\)/)
  assert.match(css, /@media\s*\(max-height:\s*500px\)\s*and\s*\(orientation:\s*landscape\)/)
  assert.match(css, /@media\s*\(min-width:\s*640px\)/)
  assert.match(css, /@media\s*\(min-width:\s*720px\)\s*and\s*\(max-width:\s*1023px\)/)
  assert.match(css, /@media\s*\(min-width:\s*1024px\)/)
  assert.match(css, /@media\s*\(min-width:\s*1024px\)\s*and\s*\(max-height:\s*820px\)/)
  assert.match(css, /@media\s*\(min-width:\s*1280px\)/)
  assert.match(css, /@media\s*\(min-width:\s*1600px\)/)
  assert.match(css, /\.app\s*>\s*\.gate\s*\{\s*grid-column:\s*1\s*\/\s*-1/)
})
