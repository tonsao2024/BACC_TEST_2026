import { JSDOM } from 'jsdom'

const dom = new JSDOM(
  '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
  { url: 'http://localhost:5173/', pretendToBeVisual: true },
)

globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.localStorage = dom.window.localStorage
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement
globalThis.Node = dom.window.Node
globalThis.getComputedStyle = dom.window.getComputedStyle
globalThis.URL = dom.window.URL
dom.window.scrollTo = () => {}
dom.window.HTMLElement.prototype.scrollIntoView = () => {}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/* --- canvas stub (jsdom has no canvas) --- */
const ctxStub = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'measureText') return () => ({ width: 80 })
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (prop === 'getImageData') return () => ({ data: [] })
      if (typeof prop === 'string') return () => {}
      return () => {}
    },
    set: () => true,
  },
)

/* tiny valid 1x1 JPEG (base64) */
const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmgA//9k='

dom.window.HTMLCanvasElement.prototype.getContext = function getContext() {
  return ctxStub
}
dom.window.HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
  return `data:image/jpeg;base64,${TINY_JPEG}`
}
dom.window.HTMLCanvasElement.prototype.toBlob = function toBlob(cb) {
  cb(new dom.window.Blob([Buffer.from(TINY_JPEG, 'base64')], { type: 'image/png' }))
}

let lastBlob = null
dom.window.URL.createObjectURL = (blob) => {
  lastBlob = blob
  return 'blob:mock'
}
dom.window.URL.revokeObjectURL = () => {}

dom.window.HTMLAnchorElement.prototype.click = function click() {}

export { dom, lastBlob }
export const getLastBlob = () => lastBlob
