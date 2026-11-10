import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MOCK_PART, PARTS } from '../data/index.js'
import { EXAM_SIZES, newSeed } from '../lib/generator.js'
import { formatThaiDateTime, humanTime, mmss } from '../lib/storage.js'
import { MAX_CHALLENGE_DECLINES, rankMatchPlayers } from '../lib/friends.js'
import { PASS_SCORE, certTier } from '../lib/certs.js'
import Icon from './Icons.jsx'
import { MiniRing, Sheet } from './ui.jsx'

const MEDALS = ['🥇', '🥈', '🥉']

const TAUNT_PRESETS = [
  'มาวัดฝีมือกันหน่อย ใครแม่นกว่ากัน! 🔥',
  'ซ้อมสอบ ธ.ก.ส. พร้อมกัน ลุยเลย! 💪',
  'แน่จริงกดรับคำท้าเลย อย่าถอยนะ 😎',
  'แข่งกันสนุกๆ ไม่จำกัดเวลา วัดความแม่นยำ 🎯',
]

function statusBadgeForPlayer(p) {
  if (!p) return { text: 'รอตอบรับ', cls: 'wait' }
  if (p.status === 'finished') return { text: `ส่งคำตอบแล้ว · ${Math.round(p.score || 0)}%`, cls: 'done' }
  if (p.status === 'playing') {
    return {
      text: `กำลังทำข้อ ${p.answeredCount || 0}/${p.totalQuestions || '?'}`,
      cls: 'play',
    }
  }
  if (p.status === 'accepted') return { text: 'พร้อมแข่ง ✅', cls: 'ok' }
  if (p.status === 'declined' || (p.declineCount || 0) >= MAX_CHALLENGE_DECLINES) {
    return { text: 'ไม่สะดวกแข่ง (ครบ 3 ครั้ง)', cls: 'no' }
  }
  if ((p.declineCount || 0) > 0) {
    return { text: `ลังเล · กดไม่แข่ง ${p.declineCount}/${MAX_CHALLENGE_DECLINES}`, cls: 'hesitate' }
  }
  return { text: 'รอตอบรับ…', cls: 'wait' }
}

/* ============================================================
   1. Global Challenge Popup (กดดันให้กดยอมรับ + ปุ่มไม่แข่งครบ 3 ครั้งหยุดเตือน)
   ============================================================ */
export function ChallengePopup({ match, declineCount = 0, onAccept, onDecline, onInspectHost }) {
  if (!match) return null
  const strike = Math.min(MAX_CHALLENGE_DECLINES - 1, Math.max(0, declineCount))
  const nextStrike = strike + 1
  const isFinal = nextStrike >= MAX_CHALLENGE_DECLINES

  const stageCopy = [
    {
      badge: `⚔️ คำท้าด่วนจากเพื่อน! · เตือนครั้งที่ 1/${MAX_CHALLENGE_DECLINES}`,
      headline: `${match.hostName} ท้าคุณประลองข้อสอบ!`,
      sub: 'เพื่อนเปิดห้องรอวัดฝีมืออยู่แล้ว อย่ายอมแพ้ตั้งแต่ยังไม่เห็นโจทย์ กดรับคำท้าแล้วลุยพร้อมกันเลย!',
      declineLabel: `ไม่แข่งตอนนี้ (ครั้งที่ 1/${MAX_CHALLENGE_DECLINES})`,
    },
    {
      badge: `👀 เพื่อนยังรอคุณอยู่! · เตือนครั้งที่ 2/${MAX_CHALLENGE_DECLINES}`,
      headline: `แน่ใจเหรอว่าจะถอยให้ ${match.hostName}?`,
      sub: 'คุณกดไม่แข่งไปแล้ว 1 ครั้งนะ! เพื่อนๆ ในห้องกำลังเตรียมลุยกันแล้ว มาออกแรงวัดความรู้กันสักตั้งเถอะ 💪',
      declineLabel: `ยังไม่แข่ง (ครั้งที่ 2/${MAX_CHALLENGE_DECLINES})`,
    },
    {
      badge: `🚨 คำเตือนครั้งสุดท้าย! · ครั้งที่ 3/${MAX_CHALLENGE_DECLINES}`,
      headline: `จะปล่อยให้ ${match.hostName} ชนะบายจริงเหรอ?!`,
      sub: 'โอกาสสุดท้ายก่อนเสียศักดิ์ศรี! หากกดไม่แข่งอีกครั้ง (ครบ 3 ครั้ง) ระบบจะถือว่าคุณไม่อยากแข่งจริงๆ และจะไม่เด้งเตือนอีก',
      declineLabel: `ไม่แข่งจริงๆ (ครบ 3/${MAX_CHALLENGE_DECLINES} · ไม่เตือนอีก)`,
    },
  ][strike]

  const players = match.players || []
  const acceptedNames = players
    .filter((p) => p.status === 'accepted' || p.status === 'playing' || p.status === 'finished')
    .map((p) => p.name)

  const modal = (
    <div className="challenge-pop-backdrop" role="dialog" aria-modal="true" aria-label="คำท้าแข่งขันจากเพื่อน">
      <div className={`challenge-pop challenge-pop--s${strike}`}>
        <div className="challenge-pop__glow" aria-hidden="true" />
        <span className={`challenge-pop__badge ${isFinal ? 'is-final' : ''}`}>{stageCopy.badge}</span>

        <div className="challenge-pop__vs">
          <span className="challenge-pop__avatar">{match.hostName?.trim().charAt(0) || 'พ'}</span>
          <span className="challenge-pop__swords" aria-hidden="true">⚔️</span>
          <span className="challenge-pop__count">+{Math.max(1, players.length - 1)} คน</span>
        </div>

        <h2 className="challenge-pop__title">{stageCopy.headline}</h2>
        <p className="challenge-pop__pressure">{stageCopy.sub}</p>

        <div className="challenge-pop__box">
          <div className="challenge-pop__exam">
            <Icon name="trophy" size={16} />
            <div>
              <b>{match.examSpec?.title || match.title}</b>
              <span>
                {match.examSpec?.totalQuestions || ''} ข้อ · ไม่จำกัดเวลา (นับเวลาสะสมตามจริง)
              </span>
            </div>
          </div>
          {match.message && <p className="challenge-pop__quote">“{match.message}”</p>}
          <div className="challenge-pop__roster">
            <span>ผู้ร่วมห้องแข่ง ({players.length} คน):</span>
            <div className="challenge-pop__chips">
              {players.map((p) => (
                <em
                  key={p.userId}
                  className={
                    p.status === 'accepted' || p.status === 'playing' || p.status === 'finished'
                      ? 'is-ready'
                      : ''
                  }
                >
                  {p.role === 'host' ? '👑 ' : ''}
                  {p.name}
                </em>
              ))}
            </div>
            {acceptedNames.length > 0 && (
              <small>พร้อมลุยแล้ว: {acceptedNames.join(', ')}</small>
            )}
          </div>
        </div>

        <div className="challenge-pop__strikes" aria-label="จำนวนครั้งที่ปฏิเสธ">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`strike-dot ${i < declineCount ? 'is-used' : ''}`} />
          ))}
          <small>
            {declineCount === 0
              ? 'ยังไม่ได้ปฏิเสธคำท้า'
              : `กดไม่แข่งไปแล้ว ${declineCount}/${MAX_CHALLENGE_DECLINES} ครั้ง`}
          </small>
        </div>

        <div className="challenge-pop__actions">
          <button type="button" className="btn btn--primary btn--block challenge-pop__accept" onClick={() => onAccept?.(match)}>
            <Icon name="fire" size={18} /> ยอมรับคำท้า · เข้าแข่งเลย!
          </button>
          <div className="challenge-pop__sub-actions">
            {onInspectHost && (
              <button
                type="button"
                className="btn btn--soft btn--sm"
                onClick={() => onInspectHost(match.hostUserId)}
              >
                <Icon name="chart" size={14} /> ดูสถิติผู้ท้า
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm challenge-pop__decline"
              onClick={() => onDecline?.(match)}
            >
              {stageCopy.declineLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal
}

/* ============================================================
   2. Friend Detailed Stats Sheet (ดูสถิติเพื่อนได้แม้ไม่ได้ตอบรับการแข่งขัน)
   ============================================================ */
export function FriendStatsSheet({ friend, meStats, onClose, onChallengeFriend }) {
  if (!friend) return null
  const partEntries = [...PARTS, MOCK_PART].map((p) => ({
    part: p,
    stat: friend.partStats?.[p.id] || null,
    myStat: meStats?.partStats?.[p.id] || null,
  }))
  const attemptedParts = partEntries.filter((e) => e.stat && e.stat.attempts > 0)

  return (
    <Sheet
      title={`สถิติของ ${friend.name}`}
      desc={
        friend.isMe
          ? 'สถิติภาพรวมของคุณในระบบ'
          : 'ดูสถิติและผลการฝึกซ้อมของเพื่อนได้ตลอดเวลา แม้ไม่ได้อยู่ในห้องแข่งขันเดียวกัน'
      }
      onClose={onClose}
    >
      <div className="fstats">
        <div className="fstats__hero">
          <span className="fstats__avatar">
            {friend.name.trim().charAt(0).toUpperCase()}
            <i className={`fstats__dot ${friend.online ? 'is-on' : ''}`} />
          </span>
          <div className="fstats__id">
            <b>
              {friend.name} {friend.isMe && <em className="board__me">ฉัน</em>}
            </b>
            <span>
              {friend.online
                ? friend.activity === 'in-quiz'
                  ? '✍️ กำลังทำข้อสอบอยู่ตอนนี้'
                  : '🟢 ออนไลน์ในระบบ'
                : friend.lastSeenAt
                  ? `เข้าใช้ล่าสุด ${formatThaiDateTime(friend.lastSeenAt)}`
                  : 'สมาชิกในระบบ'}
            </span>
          </div>
          {!friend.isMe && onChallengeFriend && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                onClose?.()
                onChallengeFriend(friend)
              }}
            >
              <Icon name="trophy" size={14} /> ท้าแข่ง
            </button>
          )}
        </div>

        <div className="fstats__grid">
          <div className="fstats__metric">
            <span className="num">{friend.count}</span>
            <small>ครั้งที่สอบ</small>
          </div>
          <div className="fstats__metric">
            <span className="num">{friend.count ? `${friend.avg}%` : '—'}</span>
            <small>คะแนนเฉลี่ย</small>
          </div>
          <div className="fstats__metric">
            <span className="num">{friend.count ? `${friend.best}%` : '—'}</span>
            <small>คะแนนสูงสุด</small>
          </div>
          <div className="fstats__metric">
            <span className="num">
              {friend.passedParts || 0}/{PARTS.length}
            </span>
            <small>พาร์ทที่ผ่าน ≥60%</small>
          </div>
        </div>

        <div className="fstats__time-bar">
          <Icon name="clock" size={14} />
          <span>เวลาทำข้อสอบสะสมทั้งหมด:</span>
          <b>{friend.totalTimeSec ? humanTime(friend.totalTimeSec) : 'ยังไม่เริ่มจับเวลา'}</b>
        </div>

        {!friend.isMe && meStats && (
          <div className="fstats__compare">
            <h4>เปรียบเทียบตัวต่อตัว (ฉัน vs {friend.name})</h4>
            {[
              { label: 'คะแนนเฉลี่ย', me: meStats.avg || 0, them: friend.avg || 0, suffix: '%' },
              { label: 'คะแนนสูงสุด', me: meStats.best || 0, them: friend.best || 0, suffix: '%' },
              {
                label: 'พาร์ทที่สอบผ่าน',
                me: meStats.passedParts || 0,
                them: friend.passedParts || 0,
                suffix: `/${PARTS.length}`,
              },
            ].map((row) => (
              <div className="fstats__cmp-row" key={row.label}>
                <span className={`num ${row.me >= row.them ? 'is-win' : ''}`}>
                  {row.me}
                  {row.suffix}
                </span>
                <span className="fstats__cmp-label">{row.label}</span>
                <span className={`num ${row.them >= row.me ? 'is-win' : ''}`}>
                  {row.them}
                  {row.suffix}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="fstats__block">
          <h4>คะแนนดีที่สุดแยกตามพาร์ท ({attemptedParts.length} พาร์ทที่เคยทำ)</h4>
          {attemptedParts.length === 0 ? (
            <p className="fstats__empty">เพื่อนยังไม่ได้ส่งคำตอบรายพาร์ทในระบบ</p>
          ) : (
            <div className="fstats__parts">
              {attemptedParts.map(({ part, stat }) => (
                <div className="fstats__part-row" key={part.id}>
                  <MiniRing value={stat.bestScore} size={36} />
                  <div className="fstats__part-info">
                    <b>
                      {part.label} · {part.title}
                    </b>
                    <span>
                      สอบ {stat.attempts} ครั้ง · ดีที่สุด {stat.bestScore}%
                      {stat.bestScore >= PASS_SCORE ? ` ${certTier(stat.bestScore).medal}` : ''}
                      {stat.bestTimeSec ? ` · เร็วสุด ${humanTime(stat.bestTimeSec)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fstats__block">
          <h4>ประวัติการทำข้อสอบล่าสุด</h4>
          {!friend.recentResults || friend.recentResults.length === 0 ? (
            <p className="fstats__empty">ยังไม่มีประวัติการสอบล่าสุด</p>
          ) : (
            <div className="fstats__recent">
              {friend.recentResults.slice(0, 6).map((r, idx) => (
                <div className="fstats__recent-row" key={r.id || idx}>
                  <span className={`fstats__score num ${r.score >= 60 ? 'is-pass' : 'is-try'}`}>
                    {Math.round(r.score)}%
                  </span>
                  <div className="fstats__recent-body">
                    <b>
                      {r.kind === 'set'
                        ? r.setName || 'ชุดสอบเสมือนจริง'
                        : `${r.partLabel || ''} · ${r.partTitle || 'พาร์ทสอบ'}`}
                    </b>
                    <span>
                      ถูก {r.correct}/{r.total} ข้อ · ใช้เวลา {mmss(r.timeUsedSec)} ·{' '}
                      {formatThaiDateTime(r.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}

/* ============================================================
   3. Create Multiplayer Match Sheet (เลือกเพื่อนได้หลายคน / ทุกคน)
   ============================================================ */
export function CreateMatchSheet({
  friends = [],
  sets = [],
  initialSelectedIds = [],
  onClose,
  onSubmit,
}) {
  const otherFriends = useMemo(() => friends.filter((f) => !f.isMe), [friends])
  const [selectedIds, setSelectedIds] = useState(() => {
    const valid = initialSelectedIds.filter((id) => otherFriends.some((f) => f.id === id))
    if (valid.length) return valid
    return otherFriends.slice(0, 1).map((f) => f.id)
  })
  const [mode, setMode] = useState('part')
  const [partId, setPartId] = useState('mock')
  const [sizeKey, setSizeKey] = useState('mini')
  const [existingSetId, setExistingSetId] = useState('')
  const [message, setMessage] = useState(TAUNT_PRESETS[0])
  const [query, setQuery] = useState('')

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return otherFriends
    return otherFriends.filter((f) => f.name.toLowerCase().includes(q))
  }, [otherFriends, query])

  const toggleFriend = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectAll = () => {
    if (selectedIds.length === otherFriends.length) setSelectedIds([])
    else setSelectedIds(otherFriends.map((f) => f.id))
  }

  const handleCreate = () => {
    let examSpec
    if (mode === 'part') {
      const target = partId === 'mock' ? MOCK_PART : PARTS.find((p) => p.id === partId) || PARTS[0]
      examSpec = {
        kind: 'part',
        partId: target.id,
        title: target.id === 'mock' ? 'Mock Exam รวมทุกพาร์ท' : `พาร์ท ${target.label} · ${target.title}`,
        label: target.id === 'mock' ? 'Mock Exam' : `พาร์ท ${target.label}`,
        totalQuestions: target.questions.length,
      }
    } else if (mode === 'existing-set' && existingSetId) {
      const s = sets.find((x) => x.id === existingSetId) || sets[0]
      examSpec = {
        kind: 'set',
        seed: s.seed,
        sizeKey: s.sizeKey,
        setId: s.id,
        setName: s.name,
        title: s.name,
        label: 'ชุดสอบเสมือนจริง',
        totalQuestions: s.sizeKey === 'mini' ? 60 : 230,
      }
    } else {
      const seed = newSeed()
      const sz = EXAM_SIZES[sizeKey] || EXAM_SIZES.mini
      const setName = `ชุดแข่งกับเพื่อน (${sz.label})`
      examSpec = {
        kind: 'set',
        seed,
        sizeKey: sz.key,
        setName,
        title: setName,
        label: 'ชุดสอบเสมือนจริง',
        totalQuestions: sz.key === 'mini' ? 60 : 230,
      }
    }

    const invitedFriends = otherFriends.filter((f) => selectedIds.includes(f.id))
    onSubmit?.({
      title: examSpec.title,
      message: message.trim(),
      examSpec,
      invitedFriends,
    })
  }

  return (
    <Sheet
      title="สร้างห้องท้าแข่งกับเพื่อน"
      desc="เลือกเพื่อนได้หลายคนพร้อมกัน · ทุกคนทำข้อสอบชุดเดียวกัน ไม่จำกัดเวลา (นับเวลาสะสม)"
      onClose={onClose}
    >
      <div className="match-form">
        <div className="match-form__group">
          <span className="field__label">1 · เลือกรูปแบบข้อสอบที่จะใช้แข่ง</span>
          <div className="seg seg--inline">
            <button
              type="button"
              className={`seg__item ${mode === 'part' ? 'is-on' : ''}`}
              onClick={() => setMode('part')}
            >
              เลือกพาร์ทสอบ
            </button>
            <button
              type="button"
              className={`seg__item ${mode === 'new-set' ? 'is-on' : ''}`}
              onClick={() => setMode('new-set')}
            >
              สุ่มชุดเสมือนจริง
            </button>
            {sets.length > 0 && (
              <button
                type="button"
                className={`seg__item ${mode === 'existing-set' ? 'is-on' : ''}`}
                onClick={() => {
                  setMode('existing-set')
                  if (!existingSetId && sets[0]) setExistingSetId(sets[0].id)
                }}
              >
                ชุดของฉัน
              </button>
            )}
          </div>

          {mode === 'part' && (
            <select
              className="field__input"
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              aria-label="เลือกพาร์ทสอบที่จะใช้แข่ง"
            >
              <option value="mock">🏆 Mock Exam รวมทุกพาร์ท ({MOCK_PART.questions.length} ข้อ)</option>
              {PARTS.map((p) => (
                <option key={p.id} value={p.id}>
                  พาร์ท {p.label} · {p.title} ({p.questions.length} ข้อ)
                </option>
              ))}
            </select>
          )}

          {mode === 'new-set' && (
            <div className="size-pick">
              {Object.values(EXAM_SIZES).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`size-card ${sizeKey === s.key ? 'is-on' : ''}`}
                  onClick={() => setSizeKey(s.key)}
                >
                  <b>{s.label}</b>
                  <span>{s.desc}</span>
                  <i>ไม่จำกัดเวลา · นับเวลาสะสม</i>
                </button>
              ))}
            </div>
          )}

          {mode === 'existing-set' && sets.length > 0 && (
            <select
              className="field__input"
              value={existingSetId}
              onChange={(e) => setExistingSetId(e.target.value)}
              aria-label="เลือกชุดข้อสอบของฉัน"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sizeKey === 'mini' ? '60 ข้อ' : '230 ข้อ'})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="match-form__group">
          <div className="match-form__head-row">
            <span className="field__label">
              2 · เลือกเพื่อนที่จะท้าแข่ง ({selectedIds.length}/{otherFriends.length} คน)
            </span>
            {otherFriends.length > 0 && (
              <button type="button" className="link-btn" onClick={selectAll}>
                {selectedIds.length === otherFriends.length ? 'ยกเลิกทั้งหมด' : 'เลือกเพื่อนทุกคน'}
              </button>
            )}
          </div>

          {otherFriends.length > 3 && (
            <input
              className="field__input field__input--sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อเพื่อนในระบบ…"
              aria-label="ค้นหาชื่อเพื่อน"
            />
          )}

          {otherFriends.length === 0 ? (
            <div className="match-form__empty">
              ยังไม่มีบัญชีเพื่อนคนอื่นปรากฏในเครื่องนี้ — สามารถสร้างห้องแข่งไว้ก่อนเพื่อให้เพื่อนที่ออนไลน์เข้ามาร่วมห้องได้ทันที!
            </div>
          ) : (
            <div className="friend-pick-list">
              {filteredFriends.map((f) => {
                const checked = selectedIds.includes(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`friend-pick ${checked ? 'is-picked' : ''}`}
                    onClick={() => toggleFriend(f.id)}
                    aria-pressed={checked}
                  >
                    <span className="friend-pick__check">{checked ? '✓' : ''}</span>
                    <span className="board__avatar">
                      {f.name.trim().charAt(0).toUpperCase()}
                      <i className={`fstats__dot ${f.online ? 'is-on' : ''}`} />
                    </span>
                    <span className="friend-pick__info">
                      <b>{f.name}</b>
                      <small>
                        {f.online ? '🟢 ออนไลน์' : 'ออฟไลน์'} ·{' '}
                        {f.count ? `เฉลี่ย ${f.avg}% (${f.count} ครั้ง)` : 'ยังไม่เคยสอบ'}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="match-form__group">
          <span className="field__label">3 · ข้อความท้าดวล (ส่งไปขึ้น Popup เครื่องเพื่อน)</span>
          <input
            className="field__input field__input--sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={90}
            placeholder="พิมพ์ข้อความท้าเพื่อน…"
          />
          <div className="taunt-chips">
            {TAUNT_PRESETS.map((t) => (
              <button key={t} type="button" className="chip chip--btn" onClick={() => setMessage(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn--primary" onClick={handleCreate}>
            <Icon name="fire" size={16} />{' '}
            {selectedIds.length > 0
              ? `ส่งคำท้าให้เพื่อน ${selectedIds.length} คน`
              : 'เปิดห้องแข่งสาธารณะ'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

/* ============================================================
   4. Match Room Card (Lobby + Live Multiplayer Progress + Podium)
   ============================================================ */
export function MatchRoomCard({
  match,
  meId,
  allFriends = [],
  onStartExam,
  onAccept,
  onNudge,
  onInviteMore,
  onCancel,
  onInspectFriend,
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const ranked = useMemo(() => rankMatchPlayers(match.players || []), [match.players])
  const mePlayer = (match.players || []).find((p) => p.userId === meId)
  const isHost = match.hostUserId === meId
  const pendingGuests = (match.players || []).filter(
    (p) => p.role !== 'host' && p.status === 'invited' && (p.declineCount || 0) < MAX_CHALLENGE_DECLINES,
  )
  const acceptedCount = (match.players || []).filter(
    (p) => p.status === 'accepted' || p.status === 'playing' || p.status === 'finished',
  ).length
  const uninvitedFriends = allFriends.filter(
    (f) => !f.isMe && !(match.players || []).some((p) => p.userId === f.id),
  )

  return (
    <article className={`match-card match-card--${match.status}`}>
      <div className="match-card__head">
        <div>
          <span className={`match-card__status is-${match.status}`}>
            {match.status === 'finished'
              ? '🏁 จบการแข่งขันแล้ว'
              : match.status === 'active'
                ? '🔥 กำลังแข่งขันสด'
                : '⏳ ห้องรอเพื่อนตอบรับ'}
          </span>
          <h4 className="match-card__title">{match.examSpec?.title || match.title}</h4>
          <p className="match-card__meta">
            รหัสห้อง <code>{match.id}</code> · เจ้าของห้อง {match.hostName} · ผู้ร่วมแข่ง{' '}
            {(match.players || []).length} คน
          </p>
        </div>
        {isHost && match.status === 'waiting' && onCancel && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => onCancel(match.id)}
            title="ปิดห้องแข่ง"
            aria-label="ปิดห้องแข่ง"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {match.message && <p className="match-card__quote">💬 “{match.message}”</p>}

      <div className="match-players">
        {ranked.map((p, idx) => {
          const badge = statusBadgeForPlayer(p)
          const pct =
            p.totalQuestions > 0 ? Math.round(((p.answeredCount || 0) / p.totalQuestions) * 100) : 0
          return (
            <div
              key={p.userId}
              className={`match-player ${p.userId === meId ? 'is-me' : ''} ${
                idx === 0 && p.status === 'finished' ? 'is-winner' : ''
              }`}
            >
              <span className="match-player__rank num">
                {p.status === 'finished' ? MEDALS[idx] || idx + 1 : p.role === 'host' ? '👑' : idx + 1}
              </span>
              <button
                type="button"
                className="match-player__who"
                onClick={() => onInspectFriend?.(p.userId)}
                title="แตะเพื่อดูสถิติของเพื่อน"
              >
                <b>
                  {p.name}
                  {p.userId === meId && <em className="board__me">ฉัน</em>}
                </b>
                <span className={`match-pill is-${badge.cls}`}>{badge.text}</span>
                {(p.status === 'playing' || p.status === 'finished') && (
                  <span className="match-player__bar">
                    <i style={{ width: `${p.status === 'finished' ? 100 : Math.max(4, pct)}%` }} />
                  </span>
                )}
              </button>
              <div className="match-player__right num">
                {p.status === 'finished' ? (
                  <>
                    <b>{Math.round(p.score || 0)}%</b>
                    <small>{mmss(p.timeUsedSec || 0)}</small>
                  </>
                ) : p.status === 'playing' ? (
                  <>
                    <b>{pct}%</b>
                    <small>{mmss(p.timeUsedSec || 0)}</small>
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="match-card__actions">
        {!mePlayer && match.status !== 'finished' && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onAccept?.(match)}>
            <Icon name="plus" size={14} /> เข้าร่วมห้องแข่งนี้
          </button>
        )}

        {mePlayer && mePlayer.status === 'invited' && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onAccept?.(match)}>
            <Icon name="check" size={14} /> ตอบรับคำท้า
          </button>
        )}

        {mePlayer &&
          (mePlayer.status === 'accepted' || mePlayer.status === 'playing') &&
          mePlayer.status !== 'finished' && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onStartExam?.(match)}
            >
              <Icon name="play" size={14} />{' '}
              {mePlayer.status === 'playing'
                ? 'ทำข้อสอบชุดแข่งต่อ'
                : acceptedCount >= 2
                  ? `เริ่มแข่งขันเลย (${acceptedCount} คนพร้อมแล้ว!)`
                  : 'เริ่มทำข้อสอบก่อนได้เลย'}
            </button>
          )}

        {pendingGuests.length > 0 && match.status !== 'finished' && (
          <button type="button" className="btn btn--soft btn--sm" onClick={() => onNudge?.(match.id)}>
            <Icon name="fire" size={14} /> เตือนเพื่อนซ้ำ ({pendingGuests.length})
          </button>
        )}

        {uninvitedFriends.length > 0 && match.status !== 'finished' && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setInviteOpen((v) => !v)}
          >
            <Icon name="plus" size={14} /> ชวนเพื่อนเพิ่ม ({uninvitedFriends.length})
          </button>
        )}
      </div>

      {inviteOpen && uninvitedFriends.length > 0 && (
        <div className="match-card__invite-more">
          <span>แตะชื่อเพื่อนเพื่อส่งคำท้าเข้าห้องนี้เพิ่ม:</span>
          <div className="taunt-chips">
            {uninvitedFriends.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip chip--btn"
                onClick={() => {
                  onInviteMore?.(match.id, [f])
                  setInviteOpen(false)
                }}
              >
                + {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

/* ============================================================
   5. Full "แข่งกับเพื่อน · ดูเพิ่มเติม" View
   ============================================================ */
export default function FriendArena({
  friends = [],
  matches = [],
  sets = [],
  meId,
  meStats,
  challengePref,
  onBack,
  onCreateMatch,
  onAcceptMatch,
  onStartMatchExam,
  onNudgeMatch,
  onInviteMore,
  onCancelMatch,
  onResetMute,
  directory = null,
  onRefreshFriends,
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [inspectFriendId, setInspectFriendId] = useState(null)
  const [createForIds, setCreateForIds] = useState(null)

  const inspectFriend = useMemo(
    () => friends.find((f) => f.id === inspectFriendId) || null,
    [friends, inspectFriendId],
  )

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase()
    return friends.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) return false
      if (filter === 'online') return f.online
      if (filter === 'tested') return f.count > 0
      return true
    })
  }, [friends, search, filter])

  const activeMatches = useMemo(
    () => matches.filter((m) => m.status === 'waiting' || m.status === 'active'),
    [matches],
  )
  const finishedMatches = useMemo(
    () => matches.filter((m) => m.status === 'finished').slice(0, 10),
    [matches],
  )

  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onBack} aria-label="ย้อนกลับ">
          <Icon name="back" size={20} />
        </button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>
            แข่งขันกับเพื่อน & สถิติทั้งระบบ
          </h1>
          <p className="brand__sub">
            สมาชิกในระบบ {friends.length} คน · แข่งพร้อมกันหลายคนได้ · ดูสถิติเพื่อนได้ทุกคน
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setCreateForIds([])}
        >
          <Icon name="fire" size={14} /> สร้างห้องแข่ง
        </button>
      </header>

      <div style={{ padding: '10px 0 0' }}>
        {challengePref?.muted && (
          <div className="arena-mute-banner" role="status">
            <div>
              <b>🔕 ปิดการเด้งเตือนคำท้าอัตโนมัติอยู่ (คุณกดไม่แข่งครบ 3 ครั้งแล้ว)</b>
              <span>ระบบจะไม่เด้ง Popup รบกวนอีก จนกว่าคุณจะกดเปิดรับคำท้าใหม่ด้วยตัวเอง</span>
            </div>
            <button type="button" className="btn btn--soft btn--sm" onClick={onResetMute}>
              เปิดรับคำท้าใหม่
            </button>
          </div>
        )}

        <section className="builder-hero">
          <span className="builder-hero__badge">
            <Icon name="trophy" size={13} /> โหมดประลองหลายคน (Multiplayer Arena)
          </span>
          <h1>ท้าเพื่อนแข่งข้อสอบชุดเดียวกัน</h1>
          <p>
            เลือกท้าเพื่อนคนเดียวหรือหลายคนพร้อมกันก็ได้ เพื่อนอีกฝ่ายจะมี Popup แจ้งเตือนให้กดยอมรับ
            และแม้เพื่อนไม่ได้ตอบรับการแข่งขัน คุณยังสามารถกดดูสถิติของเพื่อนทุกคนในระบบได้ด้านล่าง
          </p>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn--soft btn--sm"
              style={{ background: '#fff', color: '#1E40AF' }}
              onClick={() => setCreateForIds([])}
            >
              <Icon name="wand" size={15} /> ท้าเพื่อนหลายคนเลย
            </button>
          </div>
        </section>

        {/* Active multiplayer rooms */}
        <section className="section">
          <div className="section__head">
            <div>
              <h3 className="section__title">
                <Icon name="fire" size={15} /> ห้องแข่งขันที่กำลังเปิดอยู่ ({activeMatches.length})
              </h3>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                เข้าร่วมได้หลายคน · นับเวลาสะสมของแต่ละคนโดยไม่ตัดส่งอัตโนมัติ
              </p>
            </div>
          </div>

          {activeMatches.length === 0 ? (
            <div className="empty-card">
              <Icon name="trophy" size={26} />
              <b>ยังไม่มีห้องแข่งที่เปิดอยู่ตอนนี้</b>
              <span>กดปุ่ม “สร้างห้องแข่ง” หรือกด “ท้าแข่ง” ที่รายชื่อเพื่อนด้านล่างเพื่อเริ่มดวล!</span>
            </div>
          ) : (
            <div className="match-list">
              {activeMatches.map((m) => (
                <MatchRoomCard
                  key={m.id}
                  match={m}
                  meId={meId}
                  allFriends={friends}
                  onAccept={onAcceptMatch}
                  onStartExam={onStartMatchExam}
                  onNudge={onNudgeMatch}
                  onInviteMore={onInviteMore}
                  onCancel={onCancelMatch}
                  onInspectFriend={(uid) => setInspectFriendId(uid)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Complete directory of all friends in the system */}
        <section className="section">
          <div className="section__head">
            <div>
              <h3 className="section__title">
                <Icon name="user" size={15} /> รายชื่อเพื่อนทั้งหมดในระบบ ({friends.length} คน)
              </h3>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                แตะ “ดูสถิติ” เพื่อดูคะแนนเฉลี่ย พาร์ทที่ถนัด และประวัติสอบของเพื่อน (ดูได้แม้เพื่อนไม่ได้ตอบรับคำท้า)
              </p>
              {directory && (
                <p className={`arena-dir-status board__status--${
                  directory.error || !String(directory.source || '').startsWith('cloud') ? 'warn' : 'ok'
                }`} role="status">
                  {directory.syncing
                    ? '⏳ กำลังอัปเดตรายชื่อเพื่อนจากคลาวด์…'
                    : directory.error
                      ? `⚠️ ซิงก์รายชื่อไม่สำเร็จ: ${directory.error}`
                      : String(directory.source || '').startsWith('cloud')
                        ? `☁️ ซิงก์จากคลาวด์แล้ว · ${directory.cloudCount ?? friends.length} บัญชีในระบบ`
                        : '📱 ยังไม่ได้ซิงก์จากคลาวด์ · ใช้รายชื่อที่บันทึกไว้ในเครื่องนี้'}
                  {onRefreshFriends && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm arena-dir-status__btn"
                      onClick={onRefreshFriends}
                      disabled={Boolean(directory.syncing)}
                    >
                      รีเฟรช
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="arena-toolbar">
            <input
              className="field__input field__input--sm arena-toolbar__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อเพื่อนในระบบ…"
              aria-label="ค้นหาชื่อเพื่อนในระบบ"
            />
            <div className="seg seg--inline">
              {[
                { key: 'all', label: `ทั้งหมด (${friends.length})` },
                { key: 'online', label: `ออนไลน์ (${friends.filter((f) => f.online).length})` },
                { key: 'tested', label: `มีสถิติสอบ (${friends.filter((f) => f.count > 0).length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`seg__item ${filter === tab.key ? 'is-on' : ''}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="arena-friends-grid">
            {filteredFriends.map((f, i) => (
              <div key={f.id} className={`arena-friend-card ${f.isMe ? 'is-me' : ''}`}>
                <div className="arena-friend-card__top">
                  <span className="board__rank">{f.count ? MEDALS[i] || i + 1 : i + 1}</span>
                  <span className="board__avatar">
                    {f.name.trim().charAt(0).toUpperCase()}
                    <i className={`fstats__dot ${f.online ? 'is-on' : ''}`} />
                  </span>
                  <div className="arena-friend-card__info">
                    <b className="arena-friend-card__name">
                      {f.name}
                      {f.isMe && <em className="board__me">ฉัน</em>}
                    </b>
                    <span className="arena-friend-card__sub">
                      {f.online
                        ? f.activity === 'in-quiz'
                          ? '✍️ กำลังทำข้อสอบ'
                          : '🟢 ออนไลน์'
                        : '⚪ ออฟไลน์'}{' '}
                      · {f.count ? `สอบ ${f.count} ครั้ง` : 'ยังไม่เคยสอบ'}
                    </span>
                  </div>
                  <div className="arena-friend-card__score num">
                    <b>{f.count ? `${f.avg}%` : '—'}</b>
                    <small>เฉลี่ย</small>
                  </div>
                </div>

                <div className="arena-friend-card__metrics">
                  <span>สูงสุด {f.count ? `${f.best}%` : '—'}</span>
                  <span>
                    ผ่าน {f.passedParts || 0}/{PARTS.length} พาร์ท
                  </span>
                  <span>สะสม {f.totalTimeSec ? humanTime(f.totalTimeSec) : '0 วิ'}</span>
                </div>

                <div className="arena-friend-card__actions">
                  <button
                    type="button"
                    className="btn btn--soft btn--sm"
                    onClick={() => setInspectFriendId(f.id)}
                  >
                    <Icon name="chart" size={14} /> ดูสถิติ
                  </button>
                  {!f.isMe && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => setCreateForIds([f.id])}
                    >
                      <Icon name="trophy" size={14} /> ท้าแข่ง
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {finishedMatches.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h3 className="section__title">ประวัติห้องแข่งขันล่าสุด ({finishedMatches.length})</h3>
            </div>
            <div className="match-list">
              {finishedMatches.map((m) => (
                <MatchRoomCard
                  key={m.id}
                  match={m}
                  meId={meId}
                  allFriends={friends}
                  onInspectFriend={(uid) => setInspectFriendId(uid)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {inspectFriend && (
        <FriendStatsSheet
          friend={inspectFriend}
          meStats={meStats}
          onClose={() => setInspectFriendId(null)}
          onChallengeFriend={(f) => setCreateForIds([f.id])}
        />
      )}

      {createForIds !== null && (
        <CreateMatchSheet
          friends={friends}
          sets={sets}
          initialSelectedIds={createForIds}
          onClose={() => setCreateForIds(null)}
          onSubmit={(payload) => {
            setCreateForIds(null)
            onCreateMatch?.(payload)
          }}
        />
      )}
    </>
  )
}
