/* ตัวละครน่ารัก (SVG) ใช้ประดับการ์ดและหน้าแรก — ขยับได้ด้วย CSS */
export default function Mascot({
  variant = 0,
  size = 96,
  className = '',
  color = '#2563EB',
  color2 = '#60A5FA',
  idle = true,
}) {
  const v = variant % 4
  return (
    <svg
      className={`mascot mascot--${v} ${idle ? 'is-idle' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`mg${v}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>

      {/* เงา */}
      <ellipse cx="60" cy="108" rx="26" ry="6" fill="rgba(11,31,58,.12)" className="mascot__shadow" />

      {/* ตัว */}
      <g className="mascot__body">
        <path
          d="M60 62c-16 0-27 11-27 25v6c0 5 4 9 9 9h36c5 0 9-4 9-9v-6c0-14-11-25-27-25Z"
          fill={`url(#mg${v})`}
        />
        <path d="M47 66c3-2 6-3 9-3v32h-6c-3 0-5-2-5-5V70c0-2 .8-3 2-4Z" fill="#fff" opacity=".18" />

        {/* แขน */}
        <g className="mascot__arm">
          <rect x="26" y="70" width="10" height="22" rx="5" fill={color} opacity=".85" />
        </g>
        <g className="mascot__arm mascot__arm--r">
          <rect x="84" y="70" width="10" height="22" rx="5" fill={color} opacity=".85" />
        </g>

        {/* หัว */}
        <g className="mascot__head">
          <circle cx="60" cy="40" r="26" fill="#FFE9D6" />
          <path d="M34 40a26 26 0 0 1 52 0Z" fill={`url(#mg${v})`} opacity=".22" />
          <g className="mascot__eyes">
            <ellipse cx="50" cy="40" rx="3.4" ry="4" fill="#0B1F3A" />
            <ellipse cx="70" cy="40" rx="3.4" ry="4" fill="#0B1F3A" />
          </g>
          <path d="M54 50c2 3 10 3 12 0" stroke="#0B1F3A" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="43" cy="48" r="3" fill="#FFB4A2" opacity=".6" />
          <circle cx="77" cy="48" r="3" fill="#FFB4A2" opacity=".6" />

          {/* หมวก/ใบไม้ ตาม variant */}
          {v === 0 && (
            <g className="mascot__hat">
              <ellipse cx="60" cy="22" rx="30" ry="7" fill="#F5C46B" />
              <path d="M42 22c0-10 8-16 18-16s18 6 18 16Z" fill="#FFD98A" />
              <rect x="40" y="19" width="40" height="5" rx="2.5" fill={color} opacity=".55" />
            </g>
          )}
          {v === 1 && (
            <g className="mascot__hat">
              <path d="M60 8c8 0 12 6 12 12 0 5-5 8-12 8s-12-3-12-8c0-6 4-12 12-12Z" fill="#22C55E" />
              <path d="M60 14v14" stroke="#0B7A3B" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
          {v === 2 && (
            <g className="mascot__hat">
              <path d="M38 26c6-10 38-10 44 0" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="60" cy="14" r="6" fill="#FBBF24" />
            </g>
          )}
          {v === 3 && (
            <g className="mascot__hat">
              <rect x="40" y="8" width="40" height="12" rx="6" fill={color} />
              <rect x="56" y="12" width="8" height="6" rx="2" fill="#fff" opacity=".7" />
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}
