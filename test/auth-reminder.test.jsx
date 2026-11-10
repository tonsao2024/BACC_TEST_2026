import React from 'react'
import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import CloudApp from '../src/components/CloudApp.jsx'
import Sources from '../src/components/Sources.jsx'
import Home from '../src/components/Home.jsx'
import DocReader from '../src/components/DocReader.jsx'
import Quiz from '../src/components/Quiz.jsx'
import PartDetail from '../src/components/PartDetail.jsx'
import Result from '../src/components/Result.jsx'
import FriendArena, { ChallengePopup } from '../src/components/FriendArena.jsx'
import { getPart, RECRUITMENT_NOTICE, SOURCE_FILES } from '../src/data/index.js'

const { act, cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react')

const mocks = globalThis.__authMock = { signUp: null, signIn: null, onChange: null }
const session = { user: { id: 'account-1', user_metadata: { display_name: 'สมชาย ใจดี' } } }
const enterRegistration = async () => {
  await screen.findByRole('button', { name: /ผู้ใช้ใหม่/ })
  fireEvent.click(screen.getByRole('button', { name: /ผู้ใช้ใหม่/ }))
  fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้งาน'), { target: { value: 'สมชาย ใจดี' } })
  fireEvent.change(screen.getByLabelText('PIN (ตัวเลข 8–12 หลัก)'), { target: { value: '12345678' } })
  fireEvent.change(screen.getByLabelText('ยืนยัน PIN'), { target: { value: '12345678' } })
  fireEvent.click(screen.getByRole('button', { name: 'สร้างบัญชี' }))
}

describe('one-time PIN reminder', () => {
  beforeEach(() => { localStorage.clear(); mocks.signUp = null; mocks.signIn = null; mocks.onChange = null })
  afterEach(cleanup)

  it('waits for signup even if SIGNED_IN fires first and clears the PIN on acknowledgement', async () => {
    let finishSignup, invoked = false
    mocks.signUp = () => { invoked = true; return new Promise(resolve => { finishSignup = resolve }) }
    render(<CloudApp />)
    await enterRegistration()
    await waitFor(() => assert.ok(invoked))
    act(() => mocks.onChange('SIGNED_IN', session))
    assert.equal(screen.queryByText('สำคัญมาก! บันทึก PIN ไว้'), null)
    assert.equal(screen.getByRole('button', { name: 'กำลังดำเนินการ…' }).disabled, true)
    await act(async () => finishSignup({ data: { session }, error: null }))
    assert.ok(screen.getByText('สำคัญมาก! บันทึก PIN ไว้'))
    assert.ok(screen.getByText('12345678'))
    assert.ok(screen.getByText('สมชาย ใจดี'))
    assert.ok(screen.getByText(/ไม่สามารถกู้คืนบัญชีหรือประวัติเดิม/))
    assert.ok(!JSON.stringify(localStorage).includes('12345678'))
    fireEvent.click(screen.getByRole('button', { name: /บันทึกไว้แล้ว/ }))
    assert.equal(screen.queryByText('12345678'), null)
    assert.ok(screen.getByText('กำลังเตรียมข้อมูล'))
  })

  it('does not show the reminder when an existing user signs in', async () => {
    mocks.signIn = async () => { mocks.onChange('SIGNED_IN', session); return { data: { session }, error: null } }
    render(<CloudApp />)
    await screen.findByRole('button', { name: 'เข้าสู่ระบบ' })
    fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้งาน'), { target: { value: 'สมชาย ใจดี' } })
    fireEvent.change(screen.getByLabelText('PIN (ตัวเลข 8–12 หลัก)'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
    assert.ok(await screen.findByText('กำลังเตรียมข้อมูล'))
    assert.equal(screen.queryByText('สำคัญมาก! บันทึก PIN ไว้'), null)
  })

  it('does not show a success reminder if signup fails', async () => {
    mocks.signUp = async () => ({ data: { session: null }, error: { message: 'already registered' } })
    render(<CloudApp />)
    await enterRegistration()
    const alert = await screen.findByRole('alert')
    assert.equal(screen.queryByText('สำคัญมาก! บันทึก PIN ไว้'), null)
    assert.ok(alert.textContent.includes('ชื่อนี้มีผู้ใช้งานแล้ว'))
  })

  it('shows the reminder if the signup response arrives without an auth event', async () => {
    mocks.signUp = async () => ({ data: { session }, error: null })
    render(<CloudApp />)
    await enterRegistration()
    assert.ok(await screen.findByText('สำคัญมาก! บันทึก PIN ไว้'))
    assert.ok(screen.getByText('12345678'))
  })
})


describe('Drive source browser', () => {
  afterEach(cleanup)
  it('groups verified files and opens the selected PDF', () => {
    let selected
    render(<Sources onBack={() => {}} onReadDoc={(file) => { selected = file }} />)
    assert.ok(screen.getByText('เอกสาร PDF (16 ไฟล์)'))
    assert.ok(screen.getByText('ประกาศรับสมัคร'))
    assert.ok(screen.getByText('พาร์ท 1 · ความรู้ความสามารถทั่วไป'))
    assert.ok(screen.getByText(/พาร์ท 2 ความละเอียดแม่นยำอยู่ในไฟล์คลังข้อสอบ/))
    assert.equal(screen.getByRole('link', { name: /เปิดโฟลเดอร์ Google Drive/ }).getAttribute('href'), 'https://drive.google.com/drive/folders/1zcaLIPT0u6estLdIFIm-0PPyF2ACkh7f?usp=sharing')
    fireEvent.click(screen.getByRole('button', { name: /อ่าน 05_พาร์ท1-1/ }))
    assert.equal(selected.id, '1XDk1whM4xVtNnwHaH2_-WdjtpWOC9TBb')
    assert.ok(screen.getByRole('link', { name: /เปิด 00_อ่านก่อน/ }))
  })
})


describe('home recruitment notice shortcut', () => {
  afterEach(cleanup)
  it('appears immediately after the home card and opens the recruitment PDF reader', () => {
    function Fixture() {
      const [doc, setDoc] = React.useState(null)
      return <><Home name="ผู้ทดสอบ" onReadAnnouncement={() => setDoc(RECRUITMENT_NOTICE)} />
        {doc && <DocReader doc={doc} files={SOURCE_FILES} onSelect={setDoc} onClose={() => setDoc(null)} />}</>
    }
    const { container } = render(<Fixture />)
    const button = screen.getByRole('button', { name: /อ่านประกาศรับสมัคร/ })
    assert.equal(container.querySelector('.hero').nextElementSibling, button)
    fireEvent.click(button)
    const reader = screen.getByRole('dialog', { name: /ประกาศรับสมัครพนักงานการเงิน/ })
    assert.ok(reader)
    const iframe = reader.querySelector('iframe')
    assert.equal(iframe.getAttribute('src'), 'https://drive.google.com/file/d/1-prDA30BIW0GhXc91R2OO-nB7Oefzs_c/preview')
    fireEvent.click(reader.querySelector('.reader__close'))
    assert.equal(screen.queryByRole('dialog'), null)
  })
})


describe('responsive exam UI & figure zoom', () => {
  afterEach(cleanup)

  it('opens a zoomable lightbox for spatial figures and places quiz actions inside quiz-main', () => {
    const part14 = getPart('1-4')
    const figIndex = part14.questions.findIndex((q) => q.fig)
    assert.ok(figIndex >= 0)
    const exam = {
      key: 'part:1-4',
      kind: 'part',
      title: part14.title,
      label: `พาร์ท ${part14.label}`,
      partId: '1-4',
      minutes: part14.minutes,
      questions: [part14.questions[figIndex]],
    }
    const { container } = render(<Quiz exam={exam} name="ผู้ทดสอบ" onSave={() => {}} onExit={() => {}} onFinish={() => {}} />)
    assert.ok(container.querySelector('.quiz-main .quiz-foot'))
    const fig = container.querySelector('.q-figure--zoomable')
    assert.ok(fig)
    fireEvent.click(fig)
    const dialog = screen.getByRole('dialog', { name: 'ขยายภาพประกอบโจทย์' })
    assert.ok(dialog)
    fireEvent.click(screen.getByRole('button', { name: 'ซูม 2×' }))
    assert.ok(dialog.querySelector('.fig-modal__stage.is-zoomed'))
    fireEvent.click(screen.getByRole('button', { name: 'ปิดภาพขยาย' }))
    assert.equal(screen.queryByRole('dialog', { name: 'ขยายภาพประกอบโจทย์' }), null)
  })

  it('keeps PartDetail footer CSS-controlled and Result examinee input theme-safe', () => {
    const part = getPart('1-1')
    const { container: detailContainer } = render(
      <PartDetail
        part={part}
        results={[{ id: 'r1', partId: '1-1', score: 82, correct: 82, total: 100, date: '2026-11-10T00:00:00Z' }]}
        attempt={null}
        onBack={() => {}}
        onStart={() => {}}
        onRestart={() => {}}
        onReadDoc={() => {}}
        onOpenSources={() => {}}
        partFileName="test.pdf"
      />,
    )
    const foot = detailContainer.querySelector('.quiz-foot')
    assert.equal(foot.style.position, '')
    assert.ok(detailContainer.querySelector('.detail-grid'))
    assert.ok(detailContainer.querySelector('.best-card'))
    cleanup()

    const { container: resContainer } = render(
      <Result
        result={{
          id: 'r1',
          kind: 'part',
          partId: '1-1',
          partLabel: '1.1',
          partTitle: 'คณิตศาสตร์',
          score: 82,
          correct: 82,
          wrong: 18,
          skipped: 0,
          total: 100,
          timeUsedSec: 1200,
          durationSec: 5400,
          date: '2026-11-10T00:00:00Z',
          topics: [{ name: 'อนุกรม', correct: 8, total: 10 }],
          items: [],
        }}
        part={part}
        profileName="ผู้ทดสอบ"
        onHome={() => {}}
        onRetry={() => {}}
        onHistory={() => {}}
        onOpenSources={() => {}}
      />,
    )
    const input = resContainer.querySelector('.examinee-row__input')
    assert.ok(input.classList.contains('field__input'))
    assert.equal(input.style.background, '')
  })

  it('accumulates unlimited time without auto-submitting and updates PartDetail rules', () => {
    const part = getPart('1-1')
    let finished = false
    const exam = {
      key: 'part:1-1',
      kind: 'part',
      title: part.title,
      label: `พาร์ท ${part.label}`,
      partId: '1-1',
      minutes: 1,
      questions: part.questions.slice(0, 2),
    }
    const { container } = render(
      <Quiz
        exam={exam}
        name="ผู้ทดสอบ"
        attempt={{ answers: [null, null], idx: 0, usedSec: 7205 }}
        onSave={() => {}}
        onExit={() => {}}
        onFinish={() => { finished = true }}
      />,
    )
    assert.equal(finished, false)
    assert.equal(container.querySelector('.timer-chip .num').textContent, '2:00:05')
    cleanup()

    const { container: detail } = render(
      <PartDetail
        part={part}
        results={[]}
        attempt={null}
        onBack={() => {}}
        onStart={() => {}}
        onRestart={() => {}}
        onReadDoc={() => {}}
        onOpenSources={() => {}}
        partFileName="test.pdf"
      />,
    )
    assert.doesNotMatch(detail.textContent, /ส่งคำตอบอัตโนมัติเมื่อหมดเวลา/)
    assert.match(detail.textContent, /ไม่จำกัดเวลาทำข้อสอบ/)
  })

  it('renders ChallengePopup 3-strike copy and FriendArena stats for non-competing friends', () => {
    let accepted = 0
    let declined = 0
    const sampleMatch = {
      id: 'M-UI-1',
      hostUserId: 'u1',
      hostName: 'สมชาย',
      title: 'Mock Exam รวมทุกพาร์ท',
      message: 'มาดวลกัน!',
      examSpec: { kind: 'part', partId: 'mock', title: 'Mock Exam รวมทุกพาร์ท', totalQuestions: 30 },
      players: [
        { userId: 'u1', name: 'สมชาย', role: 'host', status: 'accepted' },
        { userId: 'u2', name: 'สมหญิง', role: 'guest', status: 'invited' },
        { userId: 'u3', name: 'ก้อง', role: 'guest', status: 'accepted' },
      ],
    }

    const { rerender } = render(
      <ChallengePopup
        match={sampleMatch}
        declineCount={2}
        onAccept={() => { accepted += 1 }}
        onDecline={() => { declined += 1 }}
      />,
    )
    assert.ok(screen.getByText(/คำเตือนครั้งสุดท้าย/))
    fireEvent.click(screen.getByRole('button', { name: /ไม่แข่งจริงๆ \(ครบ 3\/3/ }))
    assert.equal(declined, 1)
    rerender(
      <ChallengePopup
        match={sampleMatch}
        declineCount={0}
        onAccept={() => { accepted += 1 }}
        onDecline={() => { declined += 1 }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /ยอมรับคำท้า/ }))
    assert.equal(accepted, 1)
    cleanup()

    render(
      <FriendArena
        friends={[
          { id: 'u1', name: 'สมชาย', isMe: true, online: true, count: 3, avg: 78, best: 85, passedParts: 2, totalTimeSec: 1800, partStats: {}, recentResults: [] },
          {
            id: 'u4',
            name: 'พิมพ์ชนก',
            isMe: false,
            online: false,
            count: 5,
            avg: 91,
            best: 96,
            passedParts: 4,
            totalTimeSec: 3600,
            partStats: { '1-1': { partId: '1-1', bestScore: 96, attempts: 2, bestTimeSec: 800 } },
            recentResults: [{ id: 'rr1', kind: 'part', partId: '1-1', partLabel: '1.1', partTitle: 'คณิต', score: 96, correct: 96, total: 100, timeUsedSec: 800, date: '2026-11-10T00:00:00Z' }],
          },
        ]}
        matches={[]}
        sets={[]}
        meId="u1"
        meStats={{ avg: 78, best: 85, passedParts: 2, partStats: {} }}
        challengePref={{ declineCount: 0, muted: false }}
        onBack={() => {}}
      />,
    )
    assert.ok(screen.getByText('พิมพ์ชนก'))
    const statButtons = screen.getAllByRole('button', { name: /ดูสถิติ/ })
    fireEvent.click(statButtons[1])
    assert.ok(screen.getByRole('dialog', { name: 'สถิติของ พิมพ์ชนก' }))
    assert.ok(screen.getByText(/เปรียบเทียบตัวต่อตัว/))
  })
})

