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
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
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
