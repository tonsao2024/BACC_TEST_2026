import { useId } from 'react'
import { buildRealUserRacers, USER_CHARACTER_THEMES } from '../lib/friends.js'

/* ตัวละคร BACC SVG — ขยับได้ด้วย CSS
 * รองรับโหมด:
 * 1) idle (ตัวละครยืนปกติ variant 0..3)
 * 2) reading (ตัวละครอ่านหนังสือ เปิดหน้าไปมา และมีฟองความคิด)
 * 3) running (ตัวละครวิ่งเดี่ยว)
 * 4) RunningRacers (ตัวละครของผู้ใช้จริงที่เชื่อมโยงกับรายชื่อเรียลไทม์ด้านล่าง เรียงตามจำนวนครั้งที่สอบมากสุดอยู่หน้าสุด และใช้สีเดียวกับภาพผู้ใช้)
 */

export function ReadingMascot({
  size = 240,
  className = '',
  color = '#1D4ED8',
  color2 = '#60A5FA',
}) {
  return (
    <svg
      className={`mascot mascot--reading ${className}`}
      width={size}
      height={size}
      viewBox="0 0 180 180"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="readGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <linearGradient id="bookCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0B2149" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="cloudGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id="bulbGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>

      {/* เงาบนพื้น */}
      <ellipse
        cx="90"
        cy="164"
        rx="52"
        ry="8"
        fill="rgba(11,31,58,.22)"
        className="mascot__shadow"
      />

      {/* ละอองความคิด / ประกายปัญญา (ลอยขึ้น) */}
      <g className="mascot__thoughts-wrap">
        {/* ฟองความคิดลูกเล็ก */}
        <circle cx="120" cy="52" r="3.8" fill="#FFFFFF" opacity="0.85" className="thought-bubble tb-1" />
        <circle cx="132" cy="40" r="6" fill="#FFFFFF" opacity="0.9" className="thought-bubble tb-2" />

        {/* ก้อนเมฆความคิด */}
        <g className="thought-cloud">
          <path
            d="M130 22 Q128 12 138 12 Q144 6 154 10 Q164 6 168 16 Q178 18 174 28 Q172 36 160 36 Q146 40 138 34 Q128 32 130 22 Z"
            fill="url(#cloudGrad)"
            stroke="#FDE68A"
            strokeWidth="1.2"
            filter="drop-shadow(0 4px 10px rgba(11,31,58,0.22))"
          />

          {/* หลอดไฟปิ๊งไอเดีย / กำลังคิดโจทย์ */}
          <g className="idea-bulb">
            <path
              d="M152 14 c-3 0 -5 2 -5 5 c0 2 1.2 3.5 2.5 4.3 v2 h5 v-2 c1.3 -0.8 2.5 -2.3 2.5 -4.3 c0 -3 -2 -5 -5 -5 Z"
              fill="url(#bulbGrad)"
            />
            <rect x="150" y="25" width="4" height="1.8" rx="0.8" fill="#D97706" />
            {/* ลำแสงไอเดีย */}
            <line x1="152" y1="10" x2="152" y2="7" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="145" y1="12" x2="143" y2="9.5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="159" y1="12" x2="161" y2="9.5" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
          </g>

          {/* จุดคิด ... กำลังประมวลผลข้อสอบ */}
          <circle cx="145" cy="22" r="1.8" fill="#D97706" className="think-dot td-1" />
          <circle cx="152" cy="22" r="1.8" fill="#D97706" className="think-dot td-2" />
          <circle cx="159" cy="22" r="1.8" fill="#D97706" className="think-dot td-3" />
        </g>

        {/* ประกายวิบวับรอบศีรษะ */}
        <path
          d="M116 20 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 l3 -1.5 Z"
          fill="#FBBF24"
          className="read-sparkle read-sparkle--1"
        />
        <path
          d="M172 48 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1 Z"
          fill="#60A5FA"
          className="read-sparkle read-sparkle--2"
        />
      </g>

      {/* ลำตัวและท่านั่ง */}
      <g className="mascot__reading-body">
        {/* ขาพับ/รองเท้าผ้าใบขาวแถบน้ำเงิน */}
        <path
          d="M52 144 Q62 154 74 150 Q82 148 88 142"
          stroke="#1E3A8A"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M128 144 Q118 154 106 150 Q98 148 92 142"
          stroke="#1E3A8A"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="56" cy="151" rx="12" ry="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        <ellipse cx="124" cy="151" rx="12" ry="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        <path d="M50 151 h12" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M118 151 h12" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />

        {/* ตัวเสื้อ */}
        <path
          d="M58 96 c-14 0 -24 14 -24 32 v18 c0 5 4 9 9 9 h94 c5 0 9 -4 9 -9 v-18 c0 -18 -10 -32 -24 -32 Z"
          fill="url(#readGrad)"
        />
        {/* ปกคอเสื้อขาว + เนกไททอง */}
        <polygon points="90,96 82,114 98,114" fill="#FFFFFF" />
        <polygon points="90,112 86,130 90,134 94,130" fill="#F59E0B" />

        {/* แขนสองข้างยื่นออกมาจับหนังสือ */}
        <path
          d="M44 106 Q28 126 44 138"
          stroke="url(#readGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M136 106 Q152 126 136 138"
          stroke="url(#readGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />

        {/* หนังสือที่เปิดอยู่บนตัก */}
        <g className="mascot__book">
          {/* ปกหลังแข็งหนา */}
          <path
            d="M38 122 Q90 134 142 122 L138 144 Q90 154 42 144 Z"
            fill="url(#bookCoverGrad)"
          />

          {/* หน้าซ้ายของหนังสือ */}
          <path
            d="M40 120 Q66 126 88 129 L88 148 Q66 145 42 139 Z"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="0.8"
          />
          {/* เส้นข้อความจำลองในหน้าซ้าย */}
          <line x1="48" y1="127" x2="80" y2="131" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="48" y1="133" x2="78" y2="137" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="48" y1="139" x2="72" y2="142" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

          {/* หน้าขวาของหนังสือ */}
          <path
            d="M92 129 Q114 126 140 120 L138 139 Q114 145 92 148 Z"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="0.8"
          />
          {/* เส้นข้อความจำลองในหน้าขวา */}
          <line x1="100" y1="131" x2="132" y2="127" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="102" y1="137" x2="132" y2="133" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <line x1="106" y1="142" x2="128" y2="139" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

          {/* สันกลางหนังสือ */}
          <line x1="90" y1="128" x2="90" y2="150" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />

          {/* แผ่นหน้าที่กำลังพลิกไปมา (Animated Page Flip) */}
          <g className="mascot__page-leaf">
            <path
              d="M90 128 Q110 122 126 117 L124 136 Q108 141 90 148 Z"
              fill="#FFFDF5"
              stroke="#FDE68A"
              strokeWidth="0.9"
            />
            <line x1="96" y1="130" x2="120" y2="125" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="98" y1="135" x2="118" y2="131" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* แผ่นหน้าที่พลิกย้อนกลับ (Flutter layer) */}
          <g className="mascot__page-leaf-reverse">
            <path
              d="M90 128 Q70 122 54 117 L56 136 Q72 141 90 148 Z"
              fill="#FFFDF5"
              stroke="#FDE68A"
              strokeWidth="0.9"
            />
            <line x1="84" y1="130" x2="60" y2="125" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="82" y1="135" x2="62" y2="131" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" />
          </g>

          {/* ปลายนิ้วมือสองข้างเกาะขอบหนังสือ */}
          <circle cx="44" cy="136" r="5.5" fill="#FFE9D6" />
          <circle cx="136" cy="136" r="5.5" fill="#FFE9D6" />
        </g>

        {/* ศีรษะและใบหน้า (มีแอนิเมชันเอียงคิดและสายตากวาดอ่าน) */}
        <g className="mascot__head mascot__head--reading">
          <circle cx="90" cy="62" r="30" fill="#FFE9D6" />

          {/* หมวกบัณฑิต / หมวกเตรียมสอบ ธ.ก.ส. สีทอง */}
          <g className="mascot__hat">
            <polygon points="90,22 136,34 90,44 44,34" fill="#F5C46B" stroke="#D97706" strokeWidth="1.2" />
            <ellipse cx="90" cy="38" rx="18" ry="8" fill="#D97706" />
            <circle cx="90" cy="33" r="3" fill="#B45309" />
            <path
              d="M90 33 Q114 38 118 52"
              stroke="#B45309"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              className="mascot__tassel"
            />
            <circle cx="118" cy="54" r="3" fill="#F59E0B" />
          </g>

          {/* แก้มส้มใส */}
          <circle cx="70" cy="71" r="4.2" fill="#FFB4A2" opacity="0.8" />
          <circle cx="110" cy="71" r="4.2" fill="#FFB4A2" opacity="0.8" />

          {/* ดวงตาขยับอ่านและมองบนคิดโจทย์ */}
          <g className="mascot__eyes mascot__eyes--reading">
            <ellipse cx="78" cy="64" rx="3.8" ry="4.5" fill="#0B1F3A" className="eye-pupil eye-pupil--l" />
            <circle cx="79.5" cy="62.5" r="1.3" fill="#FFFFFF" />
            <ellipse cx="102" cy="64" rx="3.8" ry="4.5" fill="#0B1F3A" className="eye-pupil eye-pupil--r" />
            <circle cx="103.5" cy="62.5" r="1.3" fill="#FFFFFF" />
          </g>

          {/* รอยยิ้มมุ่งมั่น / อมยิ้มตอนกำลังคิดออก */}
          <path
            d="M84 74 Q90 79 96 74"
            stroke="#0B1F3A"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            className="mascot__mouth--reading"
          />
        </g>
      </g>
    </svg>
  )
}

const shortRacerName = (name = '', maxLen = 11) => {
  const clean = String(name || '').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, Math.max(1, maxLen - 1))}…`
}

/* ตัวละครของผู้ใช้จริงกำลังวิ่งแข่งกันบนลู่ — เชื่อมโยงกับผู้ใช้ใต้แบนเนอร์แบบเรียลไทม์
   ผู้ที่ทำข้อสอบมากสุด (count สูงสุด) วิ่งอยู่หน้าสุดเสมอ และสีตัวละครตรงกับสีภาพผู้ใช้ */
export function RunningRacers({
  users = [],
  activeMatch = null,
  meId = null,
  highlightedUserId = null,
  onHoverUser = null,
  onSelectUser = null,
  className = '',
  height = 156,
}) {
  const rawUid = useId()
  const svgUid = String(rawUid || 'r').replace(/[^a-zA-Z0-9_-]/g, '')
  const realRacers = buildRealUserRacers(users, { meId, activeMatch, maxRacers: 6 })
  const hasRealUsers = realRacers.length > 0

  const racers = hasRealUsers
    ? realRacers
    : [0, 1, 2, 3].map((idx) => {
        const t = USER_CHARACTER_THEMES[idx]
        const xs = [414, 300, 186, 72]
        const ys = [52, 76, 46, 70]
        return {
          id: `preview-${idx}`,
          name: `นักวิ่ง ${idx + 1}`,
          initial: String(idx + 1),
          isMe: false,
          online: true,
          activity: 'online',
          inLiveRace: false,
          count: 0,
          rank: idx + 1,
          isLeader: idx === 0,
          color: t.color,
          color2: t.color2,
          colorDark: t.dark,
          variant: idx % 4,
          x: xs[idx],
          y: ys[idx],
          statusText: '',
          isPreview: true,
          user: null,
        }
      })

  // วาดจากด้านหลังมาด้านหน้า เพื่อให้ผู้นำหน้าสุดอยู่ชั้นบนสุดเสมอไม่โดนบัง
  const paintOrder = [...racers].reverse()
  const extraUsersCount = hasRealUsers ? Math.max(0, users.length - realRacers.length) : 0

  return (
    <svg
      className={`mascot-racers ${hasRealUsers ? 'mascot-racers--real' : ''} ${className}`}
      width="100%"
      height={height}
      viewBox="0 0 530 158"
      preserveAspectRatio="xMidYMid meet"
      role={hasRealUsers ? 'group' : 'presentation'}
      aria-label={hasRealUsers ? 'ลู่วิ่งตัวละครของผู้ใช้จริง เรียงตามจำนวนครั้งที่ทำข้อสอบมากสุด' : undefined}
      aria-hidden={hasRealUsers ? undefined : 'true'}
    >
      <defs>
        {racers.map((r) => (
          <linearGradient
            key={r.id}
            id={`racerGrad-${svgUid}-${r.rank}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor={r.color} />
            <stop offset="100%" stopColor={r.color2 || r.color} />
          </linearGradient>
        ))}

        {/* ลู่สนามแข่ง */}
        <linearGradient id={`trackGrad-${svgUid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0B1F3A" stopOpacity="0.14" />
          <stop offset="35%" stopColor="#1E3A8A" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.36" />
        </linearGradient>
      </defs>

      {/* ลู่วิ่งแข่งขัน + เส้นประลู่ */}
      <g className="racers__track">
        <rect x="0" y="34" width="530" height="114" rx="16" fill={`url(#trackGrad-${svgUid})`} />
        <line x1="0" y1="62" x2="486" y2="62" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="14 10" className="track-dash" />
        <line x1="0" y1="94" x2="486" y2="94" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="14 10" className="track-dash track-dash--mid" />
        <line x1="0" y1="126" x2="486" y2="126" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="14 10" className="track-dash" />

        {/* เส้นชัยลายตารางหมากรุก (Finish Line) */}
        <g className="finish-line" transform="translate(478, 36)">
          <line x1="0" y1="0" x2="0" y2="110" stroke="#FFFFFF" strokeWidth="3" />
          <rect x="2" y="2" width="6" height="6" fill="#FFFFFF" />
          <rect x="8" y="2" width="6" height="6" fill="#0B1F3A" />
          <rect x="2" y="8" width="6" height="6" fill="#0B1F3A" />
          <rect x="8" y="8" width="6" height="6" fill="#FFFFFF" />
          <rect x="2" y="14" width="6" height="6" fill="#FFFFFF" />
          <rect x="8" y="14" width="6" height="6" fill="#0B1F3A" />
          <rect x="2" y="20" width="6" height="6" fill="#0B1F3A" />
          <rect x="8" y="20" width="6" height="6" fill="#FFFFFF" />
          <rect x="2" y="26" width="6" height="6" fill="#FFFFFF" />
          <rect x="8" y="26" width="6" height="6" fill="#0B1F3A" />

          {/* ถ้วยรางวัลทองคำหน้าเส้นชัย */}
          <g transform="translate(18, 32) scale(0.9)">
            <g className="finish-trophy">
              <path d="M4 12 Q4 24 14 24 Q24 24 24 12 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
              <path d="M4 14 Q0 14 0 18 Q0 22 4 22" stroke="#F59E0B" strokeWidth="2" fill="none" />
              <path d="M24 14 Q28 14 28 18 Q28 22 24 22" stroke="#F59E0B" strokeWidth="2" fill="none" />
              <rect x="12" y="24" width="4" height="6" fill="#D97706" />
              <rect x="8" y="30" width="12" height="4" rx="1.5" fill="#B45309" />
              <circle cx="14" cy="18" r="3" fill="#FEF08A" />
            </g>
          </g>
        </g>

        {/* เส้นความเร็วลมพัดผ่าน (Speed Lines) */}
        <line x1="80" y1="46" x2="140" y2="46" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinecap="round" className="speed-line sl-1" />
        <line x1="210" y1="54" x2="280" y2="54" stroke="rgba(255,255,255,0.33)" strokeWidth="2" strokeLinecap="round" className="speed-line sl-2" />
        <line x1="330" y1="48" x2="410" y2="48" stroke="rgba(255,255,255,0.42)" strokeWidth="2.2" strokeLinecap="round" className="speed-line sl-3" />
        <line x1="160" y1="134" x2="230" y2="134" stroke="rgba(255,255,255,0.28)" strokeWidth="1.8" strokeLinecap="round" className="speed-line sl-4" />

        {extraUsersCount > 0 && (
          <g transform="translate(8, 12)">
            <rect x="0" y="0" width="92" height="19" rx="9.5" fill="rgba(11,31,58,0.68)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <text x="46" y="13" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#E2E8F0">
              +{extraUsersCount} คนในลู่ด้านล่าง
            </text>
          </g>
        )}
      </g>

      {/* วาดตัวละครของผู้ใช้จริงแต่ละคน เชื่อมสีและข้อมูลกับรายชื่อผู้ใช้ด้านล่าง */}
      {paintOrder.map((r) => {
        const slotClass = `racer--${((r.rank - 1) % 4) + 1}`
        const isHighlighted = Boolean(highlightedUserId && r.id === highlightedUserId)
        const interactive = Boolean(!r.isPreview && (onSelectUser || onHoverUser))
        const labelTitle = `#${r.rank} ${shortRacerName(r.name, r.isMe ? 8 : 11)}${r.isMe ? ' · ฉัน' : ''}`

        return (
          <g
            key={r.id}
            className={`racer ${slotClass} ${r.isLeader ? 'is-leader' : ''} ${r.isMe ? 'is-me' : ''} ${
              isHighlighted ? 'is-highlighted' : ''
            } ${interactive ? 'is-interactive' : ''}`}
            data-user-id={r.isPreview ? undefined : r.id}
            data-user-color={r.color}
            data-rank={r.rank}
            onMouseEnter={onHoverUser && !r.isPreview ? () => onHoverUser(r.id) : undefined}
            onMouseLeave={onHoverUser && !r.isPreview ? () => onHoverUser(null) : undefined}
            onClick={onSelectUser && r.user ? () => onSelectUser(r.user) : undefined}
          >
            <g transform={`translate(${r.x}, ${r.y + 12})`}>
              {/* วงแสงเชื่อมโยงเมื่อชี้เมาส์หรือเป็นผู้ใช้งานเอง */}
              {(isHighlighted || r.isLeader) && (
                <ellipse
                  cx="8"
                  cy="50"
                  rx={isHighlighted ? 26 : 22}
                  ry={isHighlighted ? 7.5 : 5.5}
                  fill={r.color}
                  opacity={isHighlighted ? 0.45 : 0.26}
                />
              )}

              {/* ควันฝุ่นความเร็ว */}
              <g className="racer-dust">
                <circle cx="-18" cy="48" r={r.isLeader ? 5.4 : 4.6} fill="rgba(255,255,255,0.6)" />
                <circle cx="-29" cy="45" r={r.isLeader ? 4 : 3.4} fill="rgba(255,255,255,0.4)" />
              </g>

              {/* เงาใต้เท้า */}
              <ellipse cx="8" cy="50" rx={r.isLeader ? 19 : 16.5} ry="4" fill="rgba(11,31,58,0.26)" />

              {/* ขาหลัง */}
              <path
                d="M4 32 Q-12 44 -19 36"
                stroke={r.colorDark || r.color}
                strokeWidth={r.isLeader ? 7.2 : 6.4}
                strokeLinecap="round"
                className="leg-back"
              />

              {/* ลำตัวเสื้อสีประจำตัวผู้ใช้ (ตรงกับสีอวาตาร์) */}
              <path
                d={
                  r.isLeader
                    ? 'M0 16 c-10 0 -16 8 -16 18 v4 h32 v-4 c0 -10 -6 -18 -16 -18 Z'
                    : 'M0 16 c-9 0 -14.5 7 -14.5 16 v4 h29 v-4 c0 -9 -5.5 -16 -14.5 -16 Z'
                }
                fill={`url(#racerGrad-${svgUid}-${r.rank})`}
                stroke="#FFFFFF"
                strokeWidth={isHighlighted ? 1.6 : 0.8}
                strokeOpacity={isHighlighted ? 0.95 : 0.45}
                className="racer-body"
              />

              {/* ป้ายเลขอันดับบนเสื้อ */}
              <circle cx="0" cy="27.5" r={r.isLeader ? 5.4 : 4.6} fill={r.isLeader ? '#FEF08A' : 'rgba(255,255,255,0.92)'} />
              <text
                x="0"
                y="30.8"
                fontSize={r.isLeader ? '8' : '7.2'}
                fontWeight="800"
                textAnchor="middle"
                fill={r.colorDark || '#0B1F3A'}
              >
                {r.rank}
              </text>

              {/* แขนหลัง */}
              <path
                d="M-8 20 Q-21 24 -19 35"
                stroke={r.color}
                strokeWidth={r.isLeader ? 6.2 : 5.5}
                strokeLinecap="round"
                className="arm-back"
              />

              {/* ขาหน้า */}
              <path
                d="M11 32 Q24 40 20 51"
                stroke={r.color}
                strokeWidth={r.isLeader ? 7.2 : 6.4}
                strokeLinecap="round"
                className="leg-front"
              />

              {/* แขนหน้า */}
              <path
                d={r.isLeader ? 'M13 20 Q25 14 23 24' : 'M11 20 Q23 16 21 25'}
                stroke={r.color}
                strokeWidth={r.isLeader ? 6.2 : 5.5}
                strokeLinecap="round"
                className="arm-front"
              />

              {/* ศีรษะ + เอกลักษณ์ประจำตัว */}
              <g className="racer-head">
                <circle cx="7" cy="2.5" r={r.isLeader ? 15.5 : 14.2} fill="#FFE9D6" />

                {r.isLeader ? (
                  <>
                    {/* ผู้นำสอบมากสุด: สายคาดหัวดาวทอง */}
                    <rect x="-8" y="-5.5" width="29" height="5.2" rx="2.5" fill="#F59E0B" />
                    <polygon points="7,-10.5 9,-5.8 14,-5.8 10,-3 11,1.8 7,-1 3,1.8 4,-3 0,-5.8 5,-5.8" fill="#FEF08A" />
                  </>
                ) : r.variant === 1 ? (
                  <>
                    {/* หมวกแก๊ปสปอร์ตสีประจำตัว */}
                    <path d="M-7 0 Q7 -13 20 0 Z" fill={r.colorDark || r.color} />
                    <path d="M-7 0 Q-15 -2 -13 4 Z" fill={r.color} />
                  </>
                ) : r.variant === 2 ? (
                  <>
                    {/* ยอดใบไม้นำโชค + แถบสีประจำตัว */}
                    <rect x="-6.5" y="-4.5" width="26" height="4.2" rx="2" fill={r.color} />
                    <path d="M7 -13 C12 -13 14 -8 14 -4 C14 -1 10 1 7 1 C4 1 0 -1 0 -4 C0 -8 2 -13 7 -13 Z" fill="#22C55E" />
                  </>
                ) : (
                  /* ผ้าคาดศีรษะสีประจำตัว */
                  <rect x="-7" y="-4.5" width="27" height="4.6" rx="2.3" fill={r.color} />
                )}

                {/* ดวงตาและรอยยิ้มมุ่งมั่น */}
                <ellipse cx="13.5" cy="3.5" rx="2.2" ry="2.7" fill="#0B1F3A" />
                <circle cx="14.5" cy="2.4" r="0.85" fill="#FFFFFF" />
                <path d="M9 9 Q13.5 13 18 8.8" stroke="#0B1F3A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                <circle cx="7.5" cy="7.5" r="2.2" fill="#FFB4A2" opacity="0.8" />
                {r.activity === 'in-quiz' || r.inLiveRace ? (
                  <path d="M-4 -1 Q-9 -3 -7 1 Q-4 1 -4 -1" fill="#38BDF8" className="sweat-drop" />
                ) : null}
              </g>

              {/* ป้ายชื่อผู้ใช้จริง + สีเดียวกับอวาตาร์ + จำนวนครั้งที่ทำข้อสอบ */}
              {!r.isPreview && (
                <g className="racer-user-tag" transform="translate(6, -37)">
                  <rect
                    x="-54"
                    y="-12"
                    width="108"
                    height="26"
                    rx="13"
                    fill="rgba(11, 24, 49, 0.88)"
                    stroke={r.color}
                    strokeWidth={r.isLeader || isHighlighted ? '2' : '1.4'}
                  />
                  {/* จุดอวาตาร์สีเดียวกับภาพผู้ใช้ */}
                  <circle cx="-40" cy="1" r="8.5" fill={r.color} />
                  <text
                    x="-40"
                    y="4.2"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill="#FFFFFF"
                  >
                    {r.initial}
                  </text>
                  {r.online && (
                    <circle
                      cx="-33.5"
                      cy="7.5"
                      r="3"
                      fill="#10B981"
                      stroke="#0B1831"
                      strokeWidth="1.1"
                    />
                  )}
                  {/* ชื่อผู้ใช้จริง */}
                  <text
                    x="-27"
                    y="-0.5"
                    textAnchor="start"
                    fontSize="8.8"
                    fontWeight="700"
                    fill="#FFFFFF"
                  >
                    {labelTitle}
                  </text>
                  {/* จำนวนครั้งที่สอบ / สถานะเรียลไทม์ */}
                  <text
                    x="-27"
                    y="9.2"
                    textAnchor="start"
                    fontSize="7.8"
                    fontWeight="600"
                    fill={r.inLiveRace ? '#FDE047' : '#BFDBFE'}
                  >
                    {r.statusText}
                  </text>
                </g>
              )}
            </g>
          </g>
        )
      })}
    </svg>
  )
}

/* Banner สำหรับส่วน "แข่งขันกับเพื่อน"
   กรอบเดียวที่รวมลู่วิ่งตัวละครผู้ใช้จริง + ปุ่มท้าแข่ง + รายชื่อเพื่อนด้านล่างไว้ด้วยกัน */
export function FriendRaceBanner({
  users = [],
  activeMatch = null,
  meId = null,
  highlightedUserId = null,
  onHoverUser = null,
  onInspectFriend = null,
  onOpenArena,
  onCreateMatch,
  children,
}) {
  const leader = users && users.length > 0 ? users[0] : null
  return (
    <div className="friend-race-banner">
      <div className="friend-race-banner__visual">
        <RunningRacers
          users={users}
          activeMatch={activeMatch}
          meId={meId}
          highlightedUserId={highlightedUserId}
          onHoverUser={onHoverUser}
          onSelectUser={onInspectFriend}
        />
      </div>
      <div className="friend-race-banner__bar">
        <div className="friend-race-banner__info">
          <strong className="friend-race-banner__title">
            วิ่งแข่งตอบข้อสอบชุดเดียวกันแบบเรียลไทม์
          </strong>
          <span className="friend-race-banner__desc">
            {leader && leader.count > 0
              ? `ผู้นำสนามตอนนี้: ${leader.name} (สอบแล้ว ${leader.count} ครั้ง) · สีตัวละครตรงกับสีภาพผู้ใช้ด้านล่าง`
              : 'ตัวละครเชื่อมโยงกับผู้ใช้จริงด้านล่าง · ใครทำข้อสอบมากสุดวิ่งนำหน้าสุด และใช้สีเดียวกับภาพผู้ใช้'}
          </span>
        </div>
        <div className="friend-race-banner__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => (onCreateMatch ? onCreateMatch() : onOpenArena?.())}
          >
            🔥 ท้าแข่งเลย
          </button>
          <button
            type="button"
            className="btn btn--soft btn--sm"
            onClick={onOpenArena}
          >
            ดูเพิ่มเติม
          </button>
        </div>
      </div>
      {children ? <div className="friend-race-banner__list">{children}</div> : null}
    </div>
  )
}

/* ตัวละคร Mascot หลัก (เข้ากันได้กับ Props เดิม) */
export default function Mascot({
  variant = 0,
  size = 96,
  className = '',
  color = '#2563EB',
  color2 = '#60A5FA',
  idle = true,
  activity = 'idle',
}) {
  if (activity === 'reading') {
    return (
      <ReadingMascot
        size={size}
        className={className}
        color={color}
        color2={color2}
      />
    )
  }

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
