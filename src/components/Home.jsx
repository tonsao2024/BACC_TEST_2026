import { GROUPS, MOCK_PART, PARTS, TOTAL_QUESTIONS } from '../data/index.js'
import { bestFor, formatThaiDateTime, humanTime } from '../lib/storage.js'
import Icon from './Icons.jsx'
import { MiniRing, Ring } from './ui.jsx'

function PartCard({ part, results, onOpen, index }) {
  const best = bestFor(part.id, results)
  return (
    <button
      className="part-card"
      style={{ '--i': index }}
      onClick={() => onOpen(part.id)}
      aria-label={`เริ่มพาร์ท ${part.title}`}
    >
      <span
        className="part-icon"
        style={{ background: `linear-gradient(140deg, ${part.color}, ${part.color2})`, color: part.color }}
      >
        <Icon name={part.icon} size={22} stroke={1.7} style={{ color: '#fff' }} />
      </span>
      <span className="part-body">
        <span className="part-title">
          {part.title}
          <em>{part.label}</em>
        </span>
        <span className="part-meta">
          {part.questions.length} ข้อ
          <span className="dot" />
          {part.minutes} นาที
          {best && (
            <>
              <span className="dot" />
              ดีที่สุด {Math.round(best.score)}%
            </>
          )}
        </span>
      </span>
      <span className="part-right">
        {best ? <MiniRing value={best.score} /> : <Icon name="chevron" size={18} className="part-chev" />}
      </span>
    </button>
  )
}

function ResumeCard({ attempt, onResume }) {
  const total = attempt.total || 0
  const answered = (attempt.answers || []).filter((a) => a !== null).length
  const pct = total ? Math.round((answered / total) * 100) : 0
  return (
    <button className="resume-card" onClick={() => onResume(attempt)}>
      <span className="resume-card__pct num" style={{ '--p': pct }}>
        {pct}%
      </span>
      <span className="resume-card__body">
        <b>{attempt.title}</b>
        <i>
          ทำแล้ว {answered}/{total} ข้อ · ใช้ไป {humanTime(attempt.usedSec || 0)}
        </i>
        <span className="resume-card__bar">
          <i style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span className="resume-card__go">
        ทำต่อ <Icon name="play" size={13} />
      </span>
    </button>
  )
}

export default function Home({
  results = [],
  attempts = [],
  sets = [],
  name,
  theme = 'light',
  onToggleTheme,
  onOpenPart,
  onStartMock,
  onOpenHistory,
  onOpenSources,
  onOpenResult,
  onOpenAccount,
  onOpenSets,
  onNewSet,
  onResume,
}) {
  const attempted = new Set(results.map((r) => r.partId))
  const done = PARTS.filter((p) => attempted.has(p.id)).length
  const avg = results.length
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0
  const progress = Math.round((done / PARTS.length) * 100)
  const latest = results.slice(0, 3)
  const openAttempts = attempts
    .filter((a) => (a.answers || []).some((x) => x !== null))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3)

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">BACC</div>
          <div className="brand__text">
            <h1 className="brand__title">BACC Exam 2569</h1>
            <p className="brand__sub">ธ.ก.ส. · ข้อสอบพนักงานการเงิน ระดับ 4</p>
          </div>
        </div>
        <div className="topbar__spacer" />
        <button
          className="icon-btn topbar__theme"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          title={theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <button className="avatar avatar--btn" onClick={onOpenAccount} aria-label="บัญชีและผู้เข้าทดสอบ">
          {name ? name.trim().charAt(0).toUpperCase() : <Icon name="user" size={18} />}
        </button>
      </header>

      <section className="hero">
        <span className="hero__eyebrow">
          <Icon name="spark" size={13} /> เตรียมความพร้อม · ปีบัญชี 2569
        </span>
        <h2 className="hero__title">{name ? `${name} พร้อมสอบแล้ว` : 'พร้อมสอบ ธ.ก.ส. ไปกับเรา'}</h2>
        <p className="hero__desc">
          ฝึกทำข้อสอบแยกตามพาร์ท สร้างข้อสอบเสมือนจริงใหม่ได้ไม่จำกัด หยุดพักแล้วกลับมาทำต่อได้
          พร้อมเฉลยละเอียดและรายงานผลดาวน์โหลด
        </p>
        <div className="hero__row">
          <div className="hero__stats">
            <div>
              <div className="hero__stat-num num">{TOTAL_QUESTIONS}</div>
              <div className="hero__stat-label">ข้อสอบในระบบ</div>
            </div>
            <div>
              <div className="hero__stat-num num">{PARTS.length}</div>
              <div className="hero__stat-label">พาร์ทสอบ</div>
            </div>
          </div>
          <Ring value={avg} size={82}>
            <span className="num">
              {avg}
              <small>คะแนนเฉลี่ย</small>
            </span>
          </Ring>
        </div>
      </section>

      <div className="stat-row">
        <div className="stat-card" style={{ animationDelay: '60ms' }}>
          <div className="stat-card__label">
            <Icon name="checkCircle" size={13} /> พาร์ทที่ทำแล้ว
          </div>
          <div className="stat-card__value num">
            {done}
            <span>/ {PARTS.length}</span>
          </div>
        </div>
        <div className="stat-card" style={{ animationDelay: '120ms' }}>
          <div className="stat-card__label">
            <Icon name="fire" size={13} /> จำนวนครั้งที่สอบ
          </div>
          <div className="stat-card__value num">{results.length}</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '180ms' }}>
          <div className="stat-card__label">
            <Icon name="chart" size={13} /> ความคืบหน้า
          </div>
          <div className="stat-card__value num">
            {progress}
            <span>%</span>
          </div>
        </div>
      </div>

      {openAttempts.length > 0 && (
        <section className="section">
          <div className="section__head">
            <div>
              <h3 className="section__title">ทำค้างไว้ · ทยอยทำต่อ</h3>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                เวลาที่ใช้ไปถูกนับสะสมไว้แล้ว กดเพื่อกลับไปทำต่อได้ทันที
              </p>
            </div>
          </div>
          <div className="resume-list">
            {openAttempts.map((a) => (
              <ResumeCard key={a.key} attempt={a} onResume={onResume} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <div>
            <h3 className="section__title">ข้อสอบเสมือนจริง</h3>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
              สุ่มชุดใหม่ตามโครงสร้างประกาศ 80 + 50 + 100 ข้อ
            </p>
          </div>
          <button className="section__link" onClick={onOpenSets}>
            ชุดของฉัน ({sets.length})
          </button>
        </div>

        <button className="set-hero" onClick={onNewSet}>
          <span className="set-hero__glow" aria-hidden="true" />
          <span className="set-hero__badge">
            <Icon name="wand" size={14} /> ระบบสร้างข้อสอบ
          </span>
          <span className="set-hero__title">สร้างชุดสอบเสมือนจริงชุดใหม่</span>
          <span className="set-hero__desc">
            7.1.1 ความรู้ความสามารถทั่วไป 80 ข้อ/100 คะแนน · 7.1.2 ความละเอียดแม่นยำ 50 ข้อ/50 คะแนน ·
            7.1.3 ความรู้เฉพาะตำแหน่ง 100 ข้อ/100 คะแนน
          </span>
          <span className="set-hero__cta">
            เริ่มสร้างชุดข้อสอบ <Icon name="chevron" size={15} />
          </span>
        </button>

        {sets.slice(0, 2).map((s) => (
          <button key={s.id} className="set-mini" onClick={onOpenSets}>
            <span className="set-mini__icon">
              <Icon name="layers" size={17} />
            </span>
            <span className="set-mini__body">
              <b>{s.name}</b>
              <i>
                {s.sizeKey === 'mini' ? '60 ข้อ · 65 คะแนน' : '230 ข้อ · 250 คะแนน'} ·{' '}
                {formatThaiDateTime(s.createdAt)}
              </i>
            </span>
            <Icon name="chevron" size={16} className="part-chev" />
          </button>
        ))}
      </section>

      <div className="section">
        <button
          className="part-card"
          onClick={onStartMock}
          style={{
            background: 'linear-gradient(135deg,#0B2149,#1E40AF 60%,#3B82F6)',
            color: '#fff',
            border: 'none',
            padding: 18,
            boxShadow: '0 26px 50px -32px rgba(36,29,82,.95)',
          }}
        >
          <span className="part-icon" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', boxShadow: 'none' }}>
            <Icon name="trophy" size={22} style={{ color: '#fff' }} />
          </span>
          <span className="part-body">
            <span className="part-title" style={{ color: '#fff', fontSize: 15 }}>
              Mock Exam รวมทุกพาร์ท
            </span>
            <span className="part-meta" style={{ color: 'rgba(255,255,255,.72)' }}>
              {MOCK_PART.questions.length} ข้อ
              <span className="dot" style={{ background: 'rgba(255,255,255,.4)' }} />
              {MOCK_PART.minutes} นาที
              <span className="dot" style={{ background: 'rgba(255,255,255,.4)' }} />
              จับเวลาเสมือนจริง
            </span>
          </span>
          <span className="part-right">
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 13,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,.18)',
                border: '1px solid rgba(255,255,255,.25)',
              }}
            >
              <Icon name="play" size={15} style={{ color: '#fff', marginLeft: 1 }} />
            </span>
          </span>
        </button>
      </div>

      {GROUPS.map((group, gi) => (
        <section
          className="section"
          key={group.key}
          id={gi === 0 ? 'parts-start' : undefined}
          style={{ animationDelay: `${gi * 60}ms` }}
        >
          <div className="section__head">
            <div>
              <h3 className="section__title">{group.label}</h3>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                {group.desc}
              </p>
            </div>
          </div>
          <div className="part-list">
            {PARTS.filter((p) => p.group === group.key).map((part, i) => (
              <PartCard key={part.id} part={part} results={results} onOpen={onOpenPart} index={i} />
            ))}
          </div>
        </section>
      ))}

      {latest.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h3 className="section__title">ผลการทดสอบล่าสุด</h3>
            <button className="section__link" onClick={onOpenHistory}>
              ดูทั้งหมด
            </button>
          </div>
          {latest.map((r, i) => (
            <button
              key={r.id}
              className="hist-card"
              style={{ '--i': i, width: '100%', textAlign: 'left' }}
              onClick={() => onOpenResult(r)}
            >
              <span
                className="hist-score"
                style={{
                  background: r.score >= 60 ? 'var(--mint-soft)' : 'var(--coral-soft)',
                  color: r.score >= 60 ? '#067a55' : '#b42318',
                }}
              >
                {Math.round(r.score)}
              </span>
              <span className="hist-body">
                <span className="hist-title">
                  {r.kind === 'set' ? r.setName || 'ชุดสอบเสมือนจริง' : `${r.partLabel} · ${r.partTitle}`}
                </span>
                <span className="hist-sub">
                  <Icon name="clock" size={12} /> {formatThaiDateTime(r.date)}
                </span>
              </span>
              <Icon name="chevron" size={16} className="part-chev" />
            </button>
          ))}
        </section>
      )}

      <section className="section">
        <div className="info-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span className="info-item__ico" style={{ width: 30, height: 30, borderRadius: 10 }}>
            <Icon name="info" size={16} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500 }}>ชุดข้อสอบในระบบ</p>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 4 }}>
              เรียบเรียงตามโครงสร้างข้อสอบจริงของ ธ.ก.ส. พาร์ทละ 100 ข้อ — เอกสารต้นฉบับ 1,100 ข้อ
              และเฉลยฉบับเต็มอ่านได้จากในเว็บไซต์ หรือดาวน์โหลดจาก Google Drive
            </p>
            <button className="btn btn--soft btn--sm" style={{ marginTop: 10 }} onClick={onOpenSources}>
              <Icon name="docs" size={14} /> ดูเอกสารต้นฉบับ
            </button>
          </div>
        </div>
      </section>

      <p className="app__foot">
        BACC Exam 2569 · เว็บไซต์ฝึกทำข้อสอบ
        <br />
        ข้อมูลอ้างอิงจากชุดเอกสารเตรียมสอบ ธ.ก.ส. ปีบัญชี 2569
      </p>
    </>
  )
}
