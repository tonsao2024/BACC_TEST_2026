import React from 'react'
import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import CloudApp from '../src/components/CloudApp.jsx'
import Sources from '../src/components/Sources.jsx'
import Home from '../src/components/Home.jsx'
import DocReader from '../src/components/DocReader.jsx'
import { RECRUITMENT_NOTICE, SOURCE_FILES } from '../src/data/index.js'

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
