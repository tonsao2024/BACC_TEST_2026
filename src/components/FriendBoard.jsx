import { useMemo, useState } from 'react'
import Icon from './Icons.jsx'
import { FriendRaceBanner } from './Mascot.jsx'
import RaceTrack from './RaceTrack.jsx'
import { buildRaceLanes, sortFriendsByAttempts } from '../lib/friends.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function FriendBoard({
  board = [],
  matches = [],
  meId,
  meName,
  onOpenArena,
  onChallengeFriend,
  onInspectFriend,
  onCreateMatch,
  onOpenMatch,
  directory = null,
  onRefreshFriends,
}) {
  const [showAll, setShowAll] = useState(false)
  const [highlightedUserId, setHighlightedUserId] = useState(null)

  const sortedBoard = useMemo(() => sortFriendsByAttempts(board), [board])
  const visible = showAll ? sortedBoard : sortedBoard.slice(0, 8)
  const maxAttempts = useMemo(
    () => Math.max(1, ...sortedBoard.map((r) => Number(r.count) || 0)),
    [sortedBoard],
  )

  const activeMatches = matches.filter((m) => m.status === 'waiting' || m.status === 'active')
  const myActiveMatch =
    activeMatches.find((m) => (m.players || []).some((p) => p.userId === meId)) || activeMatches[0] || null
  const activeMatchLanes = useMemo(
    () =>
      myActiveMatch
        ? buildRaceLanes(myActiveMatch.players || [], {
            meId,
            totalQuestions: myActiveMatch.examSpec?.totalQuestions || 0,
            friends: sortedBoard,
          })
        : [],
    [myActiveMatch, meId, sortedBoard],
  )

  const directoryStatus = (() => {
    if (!directory) return null
    if (directory.syncing) return { icon: '⏳', text: 'กำลังอัปเดตรายชื่อเพื่อนจากคลาวด์…', tone: 'busy' }
    if (!directory.source || directory.source === 'pending') {
      return { icon: '⏳', text: 'กำลังเชื่อมต่อรายชื่อเพื่อนจากคลาวด์…', tone: 'busy' }
    }
    if (directory.error) {
      return { icon: '⚠️', text: `ซิงก์รายชื่อเพื่อนจากคลาวด์ไม่สำเร็จ: ${directory.error}`, tone: 'warn' }
    }
    if (directory.source === 'cloud' || directory.source === 'cloud-rpc') {
      const when = directory.syncedAt
        ? new Date(directory.syncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : ''
      return {
        icon: '☁️',
        text: `ซิงก์รายชื่อจากคลาวด์แล้ว · พบ ${directory.cloudCount ?? sortedBoard.length} บัญชีในระบบ${when ? ` · ${when} น.` : ''}`,
        tone: 'ok',
      }
    }
    if (directory.source === 'cloud-me-only') {
      return {
        icon: '☁️',
        text: 'คลาวด์มีแค่บัญชีของคุณ · ยังไม่พบบัญชีอื่นในระบบ (หรือรายชื่อเดิมยังไม่ถูก backfill)',
        tone: 'warn',
      }
    }
    return { icon: '📱', text: 'ยังไม่ได้ซิงก์รายชื่อจากคลาวด์ · ใช้รายชื่อที่บันทึกไว้ในเครื่องนี้', tone: 'warn' }
  })()

  return (
    <section className="section friend-board">
      <div className="section__head">
        <div>
          <h3 className="section__title">
            <Icon name="trophy" size={15} /> แข่งขันกับเพื่อน ({sortedBoard.length} คนในระบบ)
          </h3>
          <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
            ตัวละครเชื่อมกับผู้ใช้จริงแบบเรียลไทม์ · จัดอันดับตามจำนวนครั้งที่ทำข้อสอบมากสุด · สีตัวละครตรงกับสีภาพผู้ใช้
          </p>
        </div>
        {onRefreshFriends && (
          <div className="friend-board__head-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onRefreshFriends}
              disabled={Boolean(directory?.syncing)}
              aria-label="รีเฟรชรายชื่อเพื่อนจากคลาวด์"
            >
              <Icon name="refresh" size={13} /> รีเฟรชรายชื่อ
            </button>
          </div>
        )}
      </div>

      {directoryStatus && (
        <p className={`board__status board__status--${directoryStatus.tone}`} role="status">
          <span aria-hidden="true">{directoryStatus.icon}</span> {directoryStatus.text}
        </p>
      )}

      {/* กรอบเดียว: ลู่วิ่งตัวละครผู้ใช้จริง + ปุ่มท้าแข่ง + รายชื่อเพื่อนเรียลไทม์ด้านล่าง */}
      <FriendRaceBanner
        users={sortedBoard}
        activeMatch={myActiveMatch}
        meId={meId}
        highlightedUserId={highlightedUserId}
        onHoverUser={setHighlightedUserId}
        onInspectFriend={onInspectFriend}
        onOpenArena={onOpenArena}
        onCreateMatch={onCreateMatch}
      >
        {myActiveMatch && (
          <div className="board-live-wrap">
            <button
              type="button"
              className="board-live-banner"
              onClick={() => (onOpenMatch ? onOpenMatch(myActiveMatch) : onOpenArena?.())}
            >
              <span className="board-live-banner__pulse" aria-hidden="true">⚔️</span>
              <span className="board-live-banner__body">
                <b>
                  {myActiveMatch.status === 'active' ? 'กำลังแข่งขันสด' : 'ห้องรอเพื่อนตอบรับ'} ·{' '}
                  {myActiveMatch.examSpec?.title || myActiveMatch.title}
                </b>
                <small>
                  ผู้ร่วมแข่ง {(myActiveMatch.players || []).length} คน · ข้อสอบชุดเดียวกันแบบเรียลไทม์ · แตะเพื่อเข้าห้องแข่ง
                </small>
              </span>
              <span className="board-live-banner__go">
                เข้าห้อง <Icon name="chevron" size={14} />
              </span>
            </button>
            {myActiveMatch.status === 'active' && activeMatchLanes.length > 0 && (
              <RaceTrack lanes={activeMatchLanes} meId={meId} variant="compact" />
            )}
          </div>
        )}

        <div className="board">
          {sortedBoard.length === 0 && (
            <div className="board__empty">
              <span className="board__empty-emoji">🏁</span>
              <b>กำลังโหลดรายชื่อเพื่อนในระบบ</b>
              <span>ชวนเพื่อนสร้างบัญชีแล้วมาประลองข้อสอบชุดเดียวกันได้เลย</span>
            </div>
          )}

          {visible.map((row, i) => {
            const isLinked = Boolean(highlightedUserId && highlightedUserId === row.id)
            const barPct = row.count
              ? Math.max(8, Math.round((row.count / maxAttempts) * 100))
              : 4
            return (
              <div
                key={row.id}
                data-user-id={row.id}
                data-user-color={row.color}
                className={`board__row ${row.isMe ? 'is-me' : ''} ${i === 0 && row.count ? 'is-leader' : ''} ${
                  isLinked ? 'is-linked' : ''
                }`}
                style={{
                  '--i': i,
                  '--user-color': row.color,
                  '--user-color-2': row.color2 || row.color,
                }}
                onMouseEnter={() => setHighlightedUserId(row.id)}
                onMouseLeave={() => setHighlightedUserId(null)}
              >
                <span className={`board__rank r${i}`}>{row.count ? MEDALS[i] || i + 1 : i + 1}</span>
                <span
                  className="board__avatar board__avatar--colored"
                  data-user-color={row.color}
                  style={{
                    '--user-color': row.color,
                    '--user-color-2': row.color2 || row.color,
                  }}
                >
                  {row.name.trim().charAt(0).toUpperCase()}
                  <i className={`fstats__dot ${row.online ? 'is-on' : ''}`} />
                </span>
                <button
                  type="button"
                  className="board__info board__info--btn"
                  onClick={() => (onInspectFriend ? onInspectFriend(row) : onOpenArena?.())}
                  title={`ดูสถิติของ ${row.name}`}
                >
                  <span className="board__name">
                    <span className="board__name-text">{row.name}</span>
                    {row.isMe && <em className="board__me">ฉัน</em>}
                    {row.online && !row.isMe && (
                      <em className="board__online">
                        {row.activity === 'in-quiz' ? 'กำลังสอบ' : 'ออนไลน์'}
                      </em>
                    )}
                  </span>
                  <span className="board__meta">
                    {row.count
                      ? `สอบ ${row.count} ครั้ง · เฉลี่ย ${row.avg}% · สูงสุด ${row.best}%`
                      : 'ยังไม่เคยสอบ · แตะเพื่อดูสถิติ'}
                  </span>
                  <span className="board__bar">
                    <i style={{ width: `${barPct}%` }} />
                  </span>
                </button>
                <div className="board__row-actions">
                  <button
                    type="button"
                    className="board__mini-btn"
                    onClick={() => (onInspectFriend ? onInspectFriend(row) : onOpenArena?.())}
                    aria-label={`ดูสถิติของ ${row.name}`}
                  >
                    สถิติ
                  </button>
                  {!row.isMe && (
                    <button
                      type="button"
                      className="board__mini-btn board__mini-btn--primary"
                      onClick={() =>
                        onChallengeFriend ? onChallengeFriend(row) : onCreateMatch?.()
                      }
                      aria-label={`ท้าแข่งกับ ${row.name}`}
                    >
                      ท้า
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {sortedBoard.length > 8 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--block"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'ย่อรายชื่อ' : `แสดงรายชื่อเพื่อนทั้งหมด ${sortedBoard.length} คน`}
            </button>
          )}
        </div>
      </FriendRaceBanner>

      <p className="board__hint">
        {meName ? `${meName} · ` : ''}ดูสถิติของเพื่อนได้ตลอดเวลาแม้เพื่อนไม่ได้ตอบรับคำท้า · ไม่จำกัดเวลาทำข้อสอบ (นับเวลาสะสม)
      </p>
    </section>
  )
}
