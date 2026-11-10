import Icon from './Icons.jsx'

const MEDALS = ['🥇', '🥈', '🥉']

export default function FriendBoard({ board = [], onChallenge, onCreate, meName }) {
  const top = board.slice(0, 5)
  const hasData = board.some((b) => b.count > 0)

  return (
    <section className="section friend-board">
      <div className="section__head">
        <div>
          <h3 className="section__title">
            <Icon name="trophy" size={15} /> แข่งขันกับเพื่อน
          </h3>
          <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
            จัดอันดับจากคะแนนเฉลี่ยของทุกบัญชีในระบบ · ทำชุดเดียวกันแล้วเทียบกันได้
          </p>
        </div>
        <button type="button" className="btn btn--soft btn--sm" onClick={onChallenge}>
          <Icon name="share" size={13} /> ท้าเพื่อน
        </button>
      </div>

      <div className="board">
        {!hasData && (
          <div className="board__empty">
            <span className="board__empty-emoji">🏁</span>
            <b>ยังไม่มีคะแนนให้จัดอันดับ</b>
            <span>ทำข้อสอบสัก 1 ครั้ง แล้วชวนเพื่อนมาทำชุดเดียวกันเพื่อเทียบฝีมือ</span>
          </div>
        )}

        {top.map((row, i) => (
          <div
            key={row.id}
            className={`board__row ${row.isMe ? 'is-me' : ''} ${i === 0 && row.count ? 'is-leader' : ''}`}
            style={{ '--i': i }}
          >
            <span className={`board__rank r${i}`}>{row.count ? MEDALS[i] || i + 1 : i + 1}</span>
            <span className="board__avatar">{row.name.trim().charAt(0)}</span>
            <span className="board__info">
              <span className="board__name">
                {row.name}
                {row.isMe && <em className="board__me">ฉัน</em>}
              </span>
              <span className="board__meta">
                {row.count ? `${row.count} ครั้ง · ดีที่สุด ${row.best}%` : 'ยังไม่เคยทำ'}
              </span>
              <span className="board__bar">
                <i style={{ width: `${Math.max(3, row.avg)}%` }} />
              </span>
            </span>
            <span className="board__score num">{row.count ? `${row.avg}%` : '—'}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--primary btn--block board__cta" onClick={onCreate}>
        <Icon name="wand" size={16} /> สร้างชุดแข่งให้เพื่อนทำ + คัดลอกรหัส
      </button>
      <p className="board__hint">
        {meName ? `${meName} · ` : ''}รหัสชุดใช้ร่วมกันได้ ประวัติการทำของแต่ละคนยังแยกกันตามชื่อผู้เข้าทดสอบ
      </p>
    </section>
  )
}
