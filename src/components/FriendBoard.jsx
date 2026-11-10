import { useState } from 'react'
import Icon from './Icons.jsx'

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
  const visible = showAll ? board : board.slice(0, 8)
  const activeMatches = matches.filter((m) => m.status === 'waiting' || m.status === 'active')
  const myActiveMatch =
    activeMatches.find((m) => (m.players || []).some((p) => p.userId === meId)) || activeMatches[0] || null

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
        text: `ซิงก์รายชื่อจากคลาวด์แล้ว · พบ ${directory.cloudCount ?? board.length} บัญชีในระบบ${when ? ` · ${when} น.` : ''}`,
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
            <Icon name="trophy" size={15} /> แข่งขันกับเพื่อน ({board.length} คนในระบบ)
          </h3>
          <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
            แสดงชื่อเพื่อนทั้งหมดในระบบ · ท้าแข่งพร้อมกันหลายคนได้ · กดดูสถิติเพื่อนได้ทุกคน
          </p>
        </div>
        <div className="friend-board__head-actions">
          {onRefreshFriends && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onRefreshFriends}
              disabled={Boolean(directory?.syncing)}
              aria-label="รีเฟรชรายชื่อเพื่อนจากคลาวด์"
            >
              <Icon name="refresh" size={13} /> รีเฟรชรายชื่อ
            </button>
          )}
          <button type="button" className="btn btn--soft btn--sm" onClick={onOpenArena}>
            ดูเพิ่มเติม
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => (onCreateMatch ? onCreateMatch() : onOpenArena?.())}
          >
            <Icon name="fire" size={13} /> ท้าเพื่อน
          </button>
        </div>
      </div>

      {directoryStatus && (
        <p className={`board__status board__status--${directoryStatus.tone}`} role="status">
          <span aria-hidden="true">{directoryStatus.icon}</span> {directoryStatus.text}
        </p>
      )}

      {myActiveMatch && (
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
              ผู้ร่วมแข่ง {(myActiveMatch.players || []).length} คน · แตะเพื่อเข้าห้องแข่ง/ดูคะแนนสด
            </small>
          </span>
          <span className="board-live-banner__go">
            เข้าห้อง <Icon name="chevron" size={14} />
          </span>
        </button>
      )}

      <div className="board">
        {board.length === 0 && (
          <div className="board__empty">
            <span className="board__empty-emoji">🏁</span>
            <b>กำลังโหลดรายชื่อเพื่อนในระบบ</b>
            <span>ชวนเพื่อนสร้างบัญชีแล้วมาประลองข้อสอบชุดเดียวกันได้เลย</span>
          </div>
        )}

        {visible.map((row, i) => (
          <div
            key={row.id}
            className={`board__row ${row.isMe ? 'is-me' : ''} ${i === 0 && row.count ? 'is-leader' : ''}`}
            style={{ '--i': i }}
          >
            <span className={`board__rank r${i}`}>{row.count ? MEDALS[i] || i + 1 : i + 1}</span>
            <span className="board__avatar">
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
                {row.name}
                {row.isMe && <em className="board__me">ฉัน</em>}
                {row.online && !row.isMe && <em className="board__online">ออนไลน์</em>}
              </span>
              <span className="board__meta">
                {row.count
                  ? `สอบ ${row.count} ครั้ง · เฉลี่ย ${row.avg}% · สูงสุด ${row.best}%`
                  : 'ยังไม่เคยสอบ · แตะเพื่อดูสถิติ'}
              </span>
              <span className="board__bar">
                <i style={{ width: `${Math.max(3, row.avg || 0)}%` }} />
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
        ))}

        {board.length > 8 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--block"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'ย่อรายชื่อ' : `แสดงรายชื่อเพื่อนทั้งหมด ${board.length} คน`}
          </button>
        )}
      </div>

      <div className="board__cta-row">
        <button
          type="button"
          className="btn btn--primary btn--block board__cta"
          onClick={() => (onCreateMatch ? onCreateMatch() : onOpenArena?.())}
        >
          <Icon name="wand" size={16} /> สร้างห้องท้าแข่งกับเพื่อน (เลือกได้หลายคน)
        </button>
        <button
          type="button"
          className="btn btn--soft btn--block"
          onClick={onOpenArena}
        >
          <Icon name="chart" size={16} /> ดูเพิ่มเติม · สถิติเพื่อนทุกคนในระบบ & ห้องแข่งขัน
        </button>
      </div>
      <p className="board__hint">
        {meName ? `${meName} · ` : ''}ดูสถิติของเพื่อนได้ตลอดเวลาแม้เพื่อนไม่ได้ตอบรับคำท้า · ไม่จำกัดเวลาทำข้อสอบ (นับเวลาสะสม)
      </p>
    </section>
  )
}
