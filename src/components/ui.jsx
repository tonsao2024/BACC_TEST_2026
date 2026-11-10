import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icons.jsx'

function useAnimatedValue(value, delay = 90) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}

export function Ring({ value = 0, size = 78, thickness = 7, className = '', children }) {
  const animated = useAnimatedValue(value)
  const p = Math.max(0, Math.min(100, animated))
  return (
    <div className={`ring ${className}`} style={{ '--p': p, width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle
          className="ring__track"
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth={thickness}
          pathLength="100"
        />
        <circle
          className="ring__bar"
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth={thickness}
          pathLength="100"
        />
      </svg>
      <div className="ring__label">{children}</div>
    </div>
  )
}

export function MiniRing({ value = 0, size = 38 }) {
  const animated = useAnimatedValue(value, 200)
  const p = Math.max(0, Math.min(100, animated))
  return (
    <div className="mini-ring" style={{ '--p': p, width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle className="mini-ring__track" cx="50" cy="50" r="44" fill="none" strokeWidth="10" pathLength="100" />
        <circle className="mini-ring__bar" cx="50" cy="50" r="44" fill="none" strokeWidth="10" pathLength="100" />
      </svg>
      <b>{Math.round(value)}</b>
    </div>
  )
}

export function Sheet({ title, desc, children, onClose, actions }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    const prev = document.body.style.overflow
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
      >
        <div className="sheet__grab" />
        {title && <h3 className="sheet__title">{title}</h3>}
        {desc && <p className="sheet__desc">{desc}</p>}
        {children}
        {actions && <div className="sheet__actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function FigureModal({ src, alt = 'ภาพประกอบโจทย์', onClose }) {
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    const prev = document.body.style.overflow
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!src) return null

  return createPortal(
    <div className="fig-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="ขยายภาพประกอบโจทย์">
      <div className="fig-modal__bar" onClick={(e) => e.stopPropagation()}>
        <span className="fig-modal__hint">
          {zoomed ? 'เลื่อนซ้าย–ขวาเพื่อดูรายละเอียด · แตะภาพเพื่อย่อ' : 'แตะที่ภาพเพื่อซูมขยาย · เลื่อนดูได้ทุกส่วน'}
        </span>
        <button
          type="button"
          className="btn btn--soft btn--xs"
          onClick={() => setZoomed((z) => !z)}
        >
          {zoomed ? 'พอดีจอ' : 'ซูม 2×'}
        </button>
        <button type="button" className="fig-modal__close" onClick={onClose} aria-label="ปิดภาพขยาย">
          <Icon name="close" size={18} />
        </button>
      </div>
      <div
        className={`fig-modal__stage ${zoomed ? 'is-zoomed' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
      >
        <img
          src={src}
          alt={alt}
          onClick={(e) => {
            e.stopPropagation()
            setZoomed((z) => !z)
          }}
        />
      </div>
    </div>,
    document.body,
  )
}

export function Toast({ message, icon = 'checkCircle' }) {
  return createPortal(
    <div className="toast" role="status">
      <Icon name={icon} size={16} />
      <span>{message}</span>
    </div>,
    document.body,
  )
}

export function Confetti({ count = 26 }) {
  const colors = ['#2563EB', '#60A5FA', '#FFB020', '#10B981', '#FF6B57', '#5EEAD4']
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animationDuration: `${2.2 + (i % 5) * 0.45}s`,
            animationDelay: `${(i % 7) * 0.16}s`,
            width: i % 3 === 0 ? 6 : 8,
          }}
        />
      ))}
    </div>
  )
}
