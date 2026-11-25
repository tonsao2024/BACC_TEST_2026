/* ============================================================
   Live Race Track (ลู่แข่งขันสด)
   ------------------------------------------------------------
   1. แต่ละผู้แข่งได้ "เลน" ของตัวเอง 1 เลน เลยไม่มีทางบังกัน
   2. ความก้าวหน้าแสดงบนป้ายกำกับของตัววิ่งแต่ละคนโดยตรง
   3. สีตัวละครและภาพผู้ใช้ (avatar) ใช้สีเดียวกันเพื่อให้ดูง่ายขึ้นว่าใครเป็นใคร
   ============================================================ */

import { buildRaceLanes } from '../lib/friends.js'

/* ตัวละครผู้ใช้กำลังวิ่ง (SVG) — ใช้สีประจำตัวของผู้ใช้ผ่าน currentColor */
function RaceSprite({ isLeader = false }) {
  return (
    <svg className="race-sprite" viewBox="0 0 38 32" aria-hidden="true" focusable="false">
      <g className="race-sprite__figure">
        {/* ขาหลัง */}
        <path className="race-sprite__leg race-sprite__leg--back" d="M17 22 L10.5 28.5" />
        {/* ขาหน้า */}
        <path className="race-sprite__leg race-sprite__leg--front" d="M21 22 L27.5 28.5" />
        {/* แขนหลัง */}
        <path className="race-sprite__arm race-sprite__arm--back" d="M16 14 L9 18" />
        {/* แขนหน้า */}
        <path className="race-sprite__arm race-sprite__arm--front" d="M22 14 L29 10.5" />
        {/* ลำตัวสีเดียวกับภาพผู้ใช้ */}
        <path
          className="race-sprite__body"
          d="M15 11.5 h8 a3.2 3.2 0 0 1 3.2 3.2 v5.3 a2 2 0 0 1 -2 2 h-10.4 a2 2 0 0 1 -2 -2 v-5.3 a3.2 3.2 0 0 1 3.2 -3.2 Z"
        />
        {/* หัว + ผ้าคาดศีรษะสีประจำตัว + ตา */}
        <circle className="race-sprite__head" cx="21" cy="6.8" r="5" />
        <path className="race-sprite__cap" d="M15.8 4.5 h10.4" />
        {isLeader && <circle cx="21" cy="2.1" r="1.5" fill="#F59E0B" />}
        <circle className="race-sprite__eye" cx="23.2" cy="7" r="1" />
      </g>
    </svg>
  )
}

export default function RaceTrack({
  players = [],
  lanes = null,
  meId = null,
  totalQuestions = 0,
  friends = [],
  variant = 'full',
}) {
  const rows =
    lanes && lanes.length ? lanes : buildRaceLanes(players, { meId, totalQuestions, friends })
  if (!rows.length) return null

  return (
    <div className={`race-track race-track--${variant}`}>
      <span className="race-track__finish" aria-hidden="true" />
      <ol className="race-track__lanes" aria-label="ความก้าวหน้าของผู้ร่วมแข่งขัน">
        {rows.map((lane) => {
          const edge = lane.pct <= 12 ? 'is-start' : lane.pct >= 88 ? 'is-end' : 'is-mid'
          const initial = lane.initial || String(lane.name || '').trim().charAt(0).toUpperCase() || 'ผ'
          return (
            <li
              key={lane.userId}
              className={`race-lane ${edge} ${lane.isMe ? 'is-me' : ''} ${
                lane.finished ? 'is-finished' : ''
              }`}
              data-user-id={lane.userId}
              data-user-color={lane.color}
              style={{
                '--lane-color': lane.color,
                '--lane-color-2': lane.color2 || lane.color,
                '--lane-pos': `${lane.pct}%`,
              }}
            >
              <span className="race-lane__line" aria-hidden="true" />
              <span className="race-lane__runner">
                <span className="race-lane__label" title={lane.summary}>
                  <span className="race-lane__avatar" aria-hidden="true">
                    {initial}
                  </span>
                  <b>
                    {lane.medal ? `${lane.medal} ` : ''}
                    {lane.name}
                    {lane.isMe ? ' · ฉัน' : ''}
                  </b>
                  <small className="num">{lane.progressText}</small>
                </span>
                <RaceSprite isLeader={lane.rank === 1} />
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
