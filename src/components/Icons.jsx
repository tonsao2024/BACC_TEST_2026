const ICONS = {
  home: (
    <>
      <path d="M3 10.7 12 3.5l9 7.2V20a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1z" />
    </>
  ),
  grid: (
    <>
      <rect x="3.2" y="3.2" width="7.4" height="7.4" rx="2.2" />
      <rect x="13.4" y="3.2" width="7.4" height="7.4" rx="2.2" />
      <rect x="3.2" y="13.4" width="7.4" height="7.4" rx="2.2" />
      <rect x="13.4" y="13.4" width="7.4" height="7.4" rx="2.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
    </>
  ),
  docs: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  chevron: <path d="M9 5l7 7-7 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3 1.8" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.2 12.3l2.6 2.6 5-5.4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  download: (
    <>
      <path d="M12 3.5v11m0 0 4-4m-4 4-4-4" />
      <path d="M4.5 16.5v2.6a1.4 1.4 0 0 0 1.4 1.4h12.2a1.4 1.4 0 0 0 1.4-1.4v-2.6" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4.5" />
      <path d="M5 4.5h9.5l-1.6 3.4 1.6 3.4H5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6.5h12M8 12h12M8 17.5h12" />
      <circle cx="4" cy="6.5" r="1.1" />
      <circle cx="4" cy="12" r="1.1" />
      <circle cx="4" cy="17.5" r="1.1" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.2l1.9 4.6 4.6 1.9-4.6 1.9L12 16.2l-1.9-4.6L5.5 9.7l4.6-1.9z" />
      <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5.5a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4.6v1.8A3.4 3.4 0 0 0 8 10.7M17 5.5h2.4v1.8a3.4 3.4 0 0 1-3.4 3.4" />
      <path d="M12 14.5V18m-3.2 3h6.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  calc: (
    <>
      <rect x="4.5" y="3" width="15" height="18" rx="3" />
      <path d="M8 7.5h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4.2A3.2 3.2 0 0 0 6.4 7.5 3 3 0 0 0 4.6 13a3.2 3.2 0 0 0 1.9 4.9A3.1 3.1 0 0 0 9.5 21h1.1V4.2z" />
      <path d="M14.5 4.2a3.2 3.2 0 0 1 3.1 3.3 3 3 0 0 1 1.8 5.5 3.2 3.2 0 0 1-1.9 4.9 3.1 3.1 0 0 1-3 3.1h-1.1V4.2z" />
    </>
  ),
  thai: (
    <>
      <path d="M4 5.5h7.5v13H4zM12.5 5.5H20v13h-7.5z" />
      <path d="M6.5 9.5h2.5M6.5 12.5h2.5M15 9.5h2.5M15 12.5h2.5" />
    </>
  ),
  cube: (
    <>
      <path d="M12 2.8l8 4.4v9.6l-8 4.4-8-4.4V7.2z" />
      <path d="M4 7.2l8 4.4 8-4.4M12 11.6V21" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.4 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.4-3.6-8.6S9.6 5.8 12 3.4z" />
    </>
  ),
  ledger: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5z" />
      <path d="M5 17h14M9 7h6M9 10.5h6" />
    </>
  ),
  bank: (
    <>
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3 20h18" />
    </>
  ),
  loan: (
    <>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4.5h2.3l2.5 10.4h9.9l2.1-7.4H6" />
      <circle cx="9.4" cy="19" r="1.5" />
      <circle cx="17.2" cy="19" r="1.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 4.5v4h4M4 12.5A8 8 0 0 0 17.7 17.7L20 15.5" />
      <path d="M20 19.5v-4h-4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v13H6.5A2.5 2.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  share: (
    <>
      <circle cx="17.5" cy="6" r="2.6" />
      <circle cx="6.5" cy="12" r="2.6" />
      <circle cx="17.5" cy="18" r="2.6" />
      <path d="M8.9 10.7l6.2-3.4M8.9 13.3l6.2 3.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.4M12 7.9h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.7" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
  fire: (
    <>
      <path d="M12 21c3.6 0 6-2.4 6-5.6 0-4.2-4.3-6.2-4.3-9.4 0-1-.3-2-1-2.7-.4 2.6-2 3.6-3.2 5.2-1 1.4-1.5 2.7-1.5 4.3C8 17.3 8.9 21 12 21z" />
    </>
  ),
  play: <path d="M8 5.5l10 6.5-10 6.5z" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 4h5M7 7l.9 12.1A1.9 1.9 0 0 0 9.8 21h4.4a1.9 1.9 0 0 0 1.9-1.9L17 7" />
      <path d="M10.5 11v6M13.5 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.4" />
      <path d="M8.6 13.7 7.4 21l4.6-2.4L16.6 21l-1.2-7.3" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.5" width="14.4" height="10" rx="3" />
      <path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.6 1.6M9 2.5h6" />
    </>
  ),
}

export default function Icon({ name, size = 20, stroke = 1.8, className = '', style }) {
  const content = ICONS[name] || ICONS.info
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {content}
    </svg>
  )
}
