/* ============================================================
   Live Race Track (ลู่แข่งขันสด)
   ------------------------------------------------------------
   ปัญหาที่แก้: ตอนแข่งกับเพื่อน ตัววิ่งเดียวกันของแต่ละคนเคยทับกันจนมองไม่เห็น
   และความก้าวหน้าของแต่ละคนถูกเอาไปแสดงเป็นตัวเลขแยกอีกที่ (ซ้ำซ้อนกับตัววิ่ง)

   วิธีแก้ในไฟล์นี้:
   1. แต่ละผู้แข่งได้ "เลน" ของตัวเอง 1 เลน เลยไม่มีทางบังกัน
   2. ย้ายความก้าวหน้า (ทำไปกี่ข้อ / กี่ % / คะแนน + เวลา) ไปแสดงเป็นป้ายกำกับ
      ที่ตัววิ่งของเขาทันที ไม่ต้องมีตัวเลขความก้าวหน้าซ้ำอีกที่หนึ่ง
   ============================================================ */

import { buildRaceLanes } from '../lib/friends.js'

/* ตัววิ่งตัวเล็ก (SVG) — ใช้สีของเลนผ่าน currentColor */
function RaceSprite() {
  return (
    <svg className="race-sprite" viewBox="0 0 36 30" aria-hidden="true" focusable="false">
      <g className="race-sprite__figure">
        {/* ขาหลัง */}
        <path className="race-sprite__leg race-sprite__leg--back" d="M17 21 L11 27" />
        {/* ขาหน้า */}
        <path className="race-sprite__leg race-sprite__leg--front" d="M20 21 L26 27" />
        {/* แขนหลัง */}
        <path className="race-sprite__arm race-sprite__arm--back" d="M16 13 L9 17" />
        {/* แขนหน้า */}
        <path className="race-sprite__arm race-sprite__arm--front" d="M21 13 L28 10" />
        {/* ลำตัว */}
        <path
          className="race-sprite__body"
          d="M15 11 h6 a3 3 0 0 1 3 3 v5 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 v-5 a3 3 0 0 1 3 -3 Z"
        />
        {/* หัว + ผ้าคาดศีรษะ + ตา */}
        <circle className="race-sprite__head" cx="20.6" cy="6.4" r="4.6" />
        <path className="race-sprite__cap" d="M15.8 4.2 h9.6" />
        <circle className="race-sprite__eye" cx="22.6" cy="6.6" r="0.95" />
      </g>
    </svg>
  )
}

export default function RaceTrack({
  players = [],
  lanes = null,
  meId = null,
  totalQuestions = 0,
  variant = 'full',
}) {
  const rows = lanes && lanes.length ? lanes : buildRaceLanes(players, { meId, totalQuestions })
  if (!rows.length) return null

  return (
    <div className={`race-track race-track--${variant}`}>
      <span className="race-track__finish" aria-hidden="true" />
      <ol className="race-track__lanes" aria-label="ความก้าวหน้าของผู้ร่วมแข่งขัน">
        {rows.map((lane) => {
          const edge = lane.pct <= 12 ? 'is-start' : lane.pct >= 88 ? 'is-end' : 'is-mid'
          return (
            <li
              key={lane.userId}
              className={`race-lane ${edge} ${lane.isMe ? 'is-me' : ''} ${
                lane.finished ? 'is-finished' : ''
              }`}
              style={{ '--lane-color': lane.color, '--lane-pos': `${lane.pct}%` }}
            >
              <span className="race-lane__line" aria-hidden="true" />
              <span className="race-lane__runner">
                <span className="race-lane__label" title={lane.summary}>
                  <b>
                    {lane.medal ? `${lane.medal} ` : ''}
                    {lane.name}
                    {lane.isMe ? ' · ฉัน' : ''}
                  </b>
                  <small className="num">{lane.progressText}</small>
                </span>
                <RaceSprite />
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
