import { useMemo, useState } from 'react'
import { EXAM_SECTIONS, EXAM_SIZES, generateExam, newSeed } from '../lib/generator.js'
import { exportExamPdf } from '../lib/pdf.js'
import { formatThaiDateTime, humanTime, makeShareCode, parseShareCode } from '../lib/storage.js'
import { getGithubConfig } from '../lib/remote.js'
import { PARTS } from '../data/index.js'
import { parseQuestionText } from '../lib/importer.js'
import { getQbank, saveImportedQuestions } from '../lib/storage.js'
import Icon from './Icons.jsx'
import { Sheet } from './ui.jsx'

function StoreNote({ onOpenAccount }) {
  const cfg = getGithubConfig()
  return (
    <div className="store-note">
      <Icon name="info" size={15} />
      <div className="store-note__text">
        <b>ชุดข้อสอบเก็บไว้ที่ไหน</b>
        <span>
          อุปกรณ์นี้ · <code>bacc2569:sets</code> (เก็บ 40 ชุดล่าสุด) — เก็บเฉพาะ “รหัสชุด”
          แล้วสร้างข้อสอบใหม่ได้ตรงกันทุกครั้ง
        </span>
        {cfg ? (
          <span className="is-ok">
            <Icon name="checkCircle" size={11} stroke={2.2} /> ซิงก์ขึ้น GitHub อัตโนมัติ ·{' '}
            {cfg.mode === 'gist' ? 'secret gist' : `${cfg.owner}/${cfg.repo}`} → <code>{cfg.path}</code>
          </span>
        ) : (
          <span className="is-warn">
            <Icon name="refresh" size={11} /> ยังไม่เชื่อมต่อ GitHub — ข้อมูลอยู่เฉพาะเครื่องนี้
            <button type="button" className="link-btn" onClick={onOpenAccount}>
              เชื่อมต่อเพื่อสำรอง
            </button>
          </span>
        )}
      </div>
    </div>
  )
}

const sizeMeta = (sizeKey) =>
  sizeKey === 'mini'
    ? { count: 60, points: 65, minutes: 60 }
    : { count: 230, points: 250, minutes: 240 }

export default function ExamBuilder({
  sets = [],
  attempts = [],
  profile,
  onBack,
  onCreate,
  onStart,
  onResume,
  onDelete,
  onImport,
  onToast,
  onReadDoc,
  onOpenAccount,
}) {
  const [name, setName] = useState(() => `ชุดสอบเสมือนจริง ชุดที่ ${sets.length + 1}`)
  const [sizeKey, setSizeKey] = useState('official')
  const [seed, setSeed] = useState(() => newSeed())
  const [withAnswers, setWithAnswers] = useState(true)
  const [created, setCreated] = useState(null)
  const [codeInput, setCodeInput] = useState('')
  const [exporting, setExporting] = useState(null)

  const preview = useMemo(
    () => generateExam({ seed, sizeKey, name: 'preview' }),
    [seed, sizeKey],
  )

  const meta = sizeMeta(sizeKey)
  const attemptFor = (set) =>
    attempts.find((a) => a.key === `set:${set.seed}:${set.sizeKey}` && (a.answers || []).some((x) => x !== null))

  const copy = async (text, msg = 'คัดลอกรหัสแชร์แล้ว') => {
    try {
      await navigator.clipboard.writeText(text)
      onToast?.(msg)
    } catch {
      onToast?.('คัดลอกไม่สำเร็จ กรุณากดค้างเพื่อคัดลอก', 'info')
    }
  }

  const create = () => {
    const cleanName = (name || '').trim() || `ชุดสอบเสมือนจริง ชุดที่ ${sets.length + 1}`
    const set = onCreate({ name: cleanName, seed, sizeKey })
    setCreated(set)
    setName(`ชุดสอบเสมือนจริง ชุดที่ ${sets.length + 2}`)
    setSeed(newSeed())
  }

  const [importPart, setImportPart] = useState('part11')
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState(null)

  const qbankCounts = getQbank()

  const runImport = () => {
    const parsed = parseQuestionText(importText)
    setImportPreview(parsed)
    if (!parsed.questions.length) {
      onToast?.('ไม่พบข้อสอบในข้อความที่วาง', 'info')
    }
  }

  const commitImport = () => {
    if (!importPreview?.questions?.length) return
    const res = saveImportedQuestions(importPart, importPreview.questions)
    onToast?.(`นำเข้าสำเร็จ ${res.added} ข้อ · คลังพาร์ทนี้มี ${res.total} ข้อ`)
    setImportPreview(null)
    setImportText('')
    setTimeout(() => {
      try {
        window.location.reload()
      } catch {
        /* ignore */
      }
    }, 900)
  }

  const exportPdf = async (set) => {
    if (exporting) return
    setExporting({ id: set.id, done: 0, total: 1 })
    try {
      const exam = generateExam({ seed: set.seed, sizeKey: set.sizeKey, name: set.name })
      await exportExamPdf(exam, {
        examinee: profile?.name || 'ผู้เข้าสอบ',
        includeAnswers: withAnswers,
        onProgress: (done, total) => setExporting({ id: set.id, done, total }),
      })
      onToast?.(`ดาวน์โหลด PDF แล้ว · ${exam.totalCount} ข้อ`)
    } catch {
      onToast?.('สร้างไฟล์ PDF ไม่สำเร็จ', 'info')
    } finally {
      setExporting(null)
    }
  }

  const share = (set) => copy(makeShareCode(set))

  const importCode = () => {
    const parsed = parseShareCode(codeInput)
    if (!parsed) {
      onToast?.('รหัสไม่ถูกต้อง ตรวจสอบอีกครั้ง', 'info')
      return
    }
    const set = onImport(parsed)
    setCodeInput('')
    onToast?.(set ? `เพิ่ม “${set.name}” แล้ว` : 'มีชุดข้อสอบนี้อยู่แล้ว', set ? 'checkCircle' : 'info')
  }

  return (
    <>
      <header className="topbar topbar--sticky">
        <button className="icon-btn icon-btn--ghost" onClick={onBack} aria-label="ย้อนกลับ">
          <Icon name="back" size={20} />
        </button>
        <div className="brand__text" style={{ flex: 1 }}>
          <h1 className="brand__title" style={{ fontSize: 15 }}>
            ชุดข้อสอบเสมือนจริง
          </h1>
          <p className="brand__sub">สร้างใหม่ · แชร์ให้เพื่อน · ดาวน์โหลด PDF</p>
        </div>
        <button className="icon-btn" onClick={() => onReadDoc?.()} aria-label="เอกสารต้นฉบับ">
          <Icon name="docs" size={18} />
        </button>
      </header>

      <div style={{ padding: '10px 0 0' }}>
        <section className="builder-hero">
          <span className="builder-hero__badge">
            <Icon name="wand" size={13} /> ระบบสร้างข้อสอบอัตโนมัติ
          </span>
          <h1>สุ่มชุดสอบตามโครงสร้างประกาศ</h1>
          <p>
            สุ่มข้อสอบใหม่จากคลังและเทมเพลตคำนวณทุกครั้งที่กดสร้าง — ได้ชุดเดิมเสมอเมื่อใช้รหัสชุดเดิม
            จึงแชร์ให้เพื่อนทำชุดเดียวกันได้
          </p>
        </section>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">1 · ตั้งค่าชุดข้อสอบ</h3>
          </div>

          <div className="info-card builder-form">
            <label className="field">
              <span className="field__label">ชื่อชุดข้อสอบ</span>
              <input
                className="field__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={70}
                placeholder="เช่น ชุดสอบเสมือนจริง ชุดที่ 1"
                aria-label="ชื่อชุดข้อสอบ"
              />
            </label>

            <span className="field__label" style={{ marginTop: 14 }}>
              ขนาดชุดข้อสอบ
            </span>
            <div className="size-pick">
              {Object.values(EXAM_SIZES).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`size-card ${sizeKey === s.key ? 'is-on' : ''}`}
                  onClick={() => setSizeKey(s.key)}
                  aria-pressed={sizeKey === s.key}
                >
                  <b>{s.label}</b>
                  <span>{s.desc}</span>
                  <i>{s.minutes} นาที</i>
                </button>
              ))}
            </div>

            <div className="struct-preview">
              {EXAM_SECTIONS.map((s) => {
                const conf = sizeKey === 'mini' ? s.mini : s.official
                return (
                  <div className="struct-row" key={s.key}>
                    <span className="struct-row__dot" style={{ background: s.color }} />
                    <span className="struct-row__label">{s.label}</span>
                    <span className="struct-row__num num">{conf.count} ข้อ</span>
                    <span className="struct-row__pts num">{conf.points} คะแนน</span>
                  </div>
                )
              })}
              <div className="struct-total">
                <span>รวม</span>
                <b className="num">
                  {meta.count} ข้อ · {meta.points} คะแนน
                </b>
              </div>
              <div className="struct-note">
                <Icon name="info" size={13} />
                คละข้อสอบจากคลัง 118 ข้อ + เทมเพลตคำนวณ/ความละเอียดที่สร้างใหม่ · ซ้ำกัน{' '}
                {preview.repeats} ข้อ
              </div>
            </div>

            <div className="seed-row">
              <span className="seed-row__label">รหัสชุด</span>
              <code className="seed-row__code">{seed}</code>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSeed(newSeed())}>
                <Icon name="refresh" size={14} /> สุ่มใหม่
              </button>
            </div>

            <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={create}>
              <Icon name="spark" size={17} /> สร้างชุดข้อสอบนี้
            </button>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h3 className="section__title">2 · ชุดข้อสอบของฉัน ({sets.length})</h3>
              <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                ประวัติการทำของแต่ละคนแยกกัน แม้จะทำชุดเดียวกัน
              </p>
            </div>
            <label className="check-inline">
              <input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />
              แนบเฉลยใน PDF
            </label>
          </div>

          <StoreNote onOpenAccount={onOpenAccount} />

          {sets.length === 0 && (
            <div className="empty-card">
              <Icon name="layers" size={26} />
              <b>ยังไม่มีชุดข้อสอบ</b>
              <span>กดปุ่ม “สร้างชุดข้อสอบนี้” ด้านบนเพื่อเริ่มชุดแรก</span>
            </div>
          )}

          <div className="set-list">
            {sets.map((set) => {
              const m = sizeMeta(set.sizeKey)
              const att = attemptFor(set)
              const answered = att ? (att.answers || []).filter((x) => x !== null).length : 0
              const exp = exporting?.id === set.id ? exporting : null
              return (
                <article className="set-card" key={set.id}>
                  <div className="set-card__head">
                    <span className="set-card__icon">
                      <Icon name="layers" size={18} />
                    </span>
                    <div className="set-card__id">
                      <b>{set.name}</b>
                      <span>
                        {m.count} ข้อ · {m.points} คะแนน · {formatThaiDateTime(set.createdAt)}
                      </span>
                      <span className="set-card__owner">
                        <Icon name="user" size={11} /> {set.owner || profile?.name || 'ผู้เข้าทดสอบ'}
                        {set.imported ? ' · รับจากเพื่อน' : ''}
                      </span>
                    </div>
                  </div>

                  {att && (
                    <div className="set-card__progress">
                      <span>
                        ทำค้างไว้ {answered}/{att.total} ข้อ · {humanTime(att.usedSec || 0)}
                      </span>
                      <span className="set-card__bar">
                        <i style={{ width: `${(answered / att.total) * 100}%` }} />
                      </span>
                    </div>
                  )}

                  <div className="set-card__actions">
                    {att && (
                      <button className="btn btn--ghost btn--sm" onClick={() => onResume?.(att)}>
                        <Icon name="play" size={14} /> ทำต่อ
                      </button>
                    )}
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => onStart(set, { fresh: Boolean(att) })}
                    >
                      <Icon name={att ? 'refresh' : 'play'} size={14} />
                      {att ? 'เริ่มใหม่' : 'เริ่มสอบ'}
                    </button>
                    <button
                      className="btn btn--soft btn--sm"
                      onClick={() => exportPdf(set)}
                      disabled={Boolean(exporting)}
                    >
                      <Icon name="download" size={14} />
                      {exp ? `PDF ${exp.done}/${exp.total}` : 'PDF ข้อสอบ'}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => share(set)}>
                      <Icon name="share" size={14} /> แชร์
                    </button>
                    <button
                      className="icon-btn set-card__del"
                      onClick={() => onDelete(set.id)}
                      aria-label={`ลบ ${set.name}`}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h3 className="section__title">3 · รับชุดข้อสอบจากเพื่อน</h3>
          </div>
          <div className="info-card">
            <p className="sub" style={{ margin: '0 0 10px', fontSize: 11.5 }}>
              วาง “รหัสแชร์” ที่เพื่อนส่งมา ระบบจะสร้างชุดข้อสอบ identical ให้ทำด้วยกัน
              แต่ประวัติการทำจะถูกเก็บแยกตามชื่อผู้เข้าทดสอบ
            </p>
            <div className="code-row">
              <input
                className="field__input"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="วางรหัสแชร์ เช่น eyJzIjoi..."
                aria-label="รหัสแชร์ชุดข้อสอบ"
                spellCheck="false"
              />
              <button
                className="btn btn--primary btn--sm"
                onClick={importCode}
                disabled={!codeInput.trim()}
              >
                <Icon name="plus" size={15} /> นำเข้า
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section__head">
          <div>
            <h3 className="section__title">3 · นำเข้าข้อสอบจากไฟล์ (DOCX / PDF)</h3>
            <p className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
              คัดลอกข้อความจากไฟล์คลังข้อสอบมาวาง ระบบจะแยกโจทย์ ตัวเลือก และเฉลยให้อัตโนมัติ
            </p>
          </div>
        </div>

        <div className="info-card import-card">
          <label className="field">
            <span className="field__label">พาร์ทปลายทาง</span>
            <select
              className="field__input"
              value={importPart}
              onChange={(e) => setImportPart(e.target.value)}
            >
              {PARTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.title} ({(qbankCounts[p.id] || []).length} ข้อที่นำเข้าแล้ว)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">วางข้อความข้อสอบ</span>
            <textarea
              className="field__input import-area"
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'ข้อ 1. จงหาจำนวนถัดไป ...\n1) 36\n2) 37\n3) 38\n4) 39\n...\nเฉลย\n1. 2'}
            />
          </label>

          <div className="import-actions">
            <button type="button" className="btn btn--soft btn--sm" onClick={runImport} disabled={!importText.trim()}>
              <Icon name="target" size={14} /> ตรวจสอบข้อความ
            </button>
            {importPreview && (
              <span className="import-count">
                พบ {importPreview.questions.length} ข้อ
                {importPreview.warnings.length ? ` · มีปัญหา ${importPreview.warnings.length} จุด` : ' · ครบถ้วน'}
              </span>
            )}
          </div>

          {importPreview && importPreview.questions.length > 0 && (
            <>
              <div className="import-preview">
                {importPreview.questions.slice(0, 3).map((q, i) => (
                  <div key={i} className="import-preview__row">
                    <b>{i + 1}.</b> {q.q.slice(0, 90)}
                    <span>
                      เฉลย: {q.o[q.a]?.slice(0, 40)}
                    </span>
                  </div>
                ))}
                {importPreview.questions.length > 3 && (
                  <p className="import-preview__more">
                    … และอีก {importPreview.questions.length - 3} ข้อ
                  </p>
                )}
              </div>
              {importPreview.warnings.length > 0 && (
                <p className="import-warn">
                  <Icon name="info" size={12} /> {importPreview.warnings.slice(0, 3).join(' · ')}
                </p>
              )}
              <button type="button" className="btn btn--primary btn--block" onClick={commitImport}>
                <Icon name="check" size={15} /> บันทึก {importPreview.questions.length} ข้อเข้าคลัง
              </button>
            </>
          )}
        </div>
      </section>

      {created && (
        <Sheet
          title="สร้างชุดข้อสอบสำเร็จ"
          desc={`${created.name} · ${sizeMeta(created.sizeKey).count} ข้อ`}
          onClose={() => setCreated(null)}
        >
          <div className="share-box">
            <span className="share-box__label">รหัสแชร์ให้เพื่อน</span>
            <code>{makeShareCode(created)}</code>
            <button
              type="button"
              className="btn btn--soft btn--sm"
              onClick={() => copy(makeShareCode(created))}
            >
              <Icon name="copy" size={14} /> คัดลอกรหัส
            </button>
          </div>
          <StoreNote onOpenAccount={onOpenAccount} />

          <div className="sheet__actions">
            <button className="btn btn--ghost" onClick={() => setCreated(null)}>
              ไว้ก่อน
            </button>
            <button
              className="btn btn--primary"
              onClick={() => {
                const set = created
                setCreated(null)
                onStart(set, { fresh: true })
              }}
            >
              <Icon name="play" size={16} /> เริ่มสอบเลย
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
