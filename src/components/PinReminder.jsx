import Icon from './Icons.jsx'

/** Shown once, only after successful signup. The PIN is never persisted here. */
export default function PinReminder({ name, pin, onContinue }) {
  return (
    <div className="gate">
      <div className="gate__blob gate__blob--1" />
      <div className="gate__blob gate__blob--2" />
      <section className="gate__card" aria-labelledby="pin-reminder-title">
        <div className="gate__mark"><Icon name="lock" size={26} /></div>
        <p className="gate__eyebrow">สร้างบัญชีสำเร็จ</p>
        <h1 className="gate__title" id="pin-reminder-title">สำคัญมาก! บันทึก PIN ไว้</h1>
        <p className="gate__desc">กรุณาแคปหน้าจอนี้หรือบันทึกชื่อและ PIN ไว้ในที่ปลอดภัย ก่อนเข้าใช้งาน</p>
        <div className="pin-reminder__credentials">
          <span>ชื่อผู้ใช้งาน</span><strong>{name}</strong>
          <span>PIN ของคุณ</span><strong className="pin-reminder__pin">{pin}</strong>
        </div>
        <p className="pin-reminder__warning" role="status">
          หากลืม PIN ระบบไม่สามารถกู้คืนบัญชีหรือประวัติเดิมได้ ต้องสมัครบัญชีใหม่ด้วยชื่ออื่นเท่านั้น
        </p>
        <p className="gate__note">ภาพหน้าจออาจเปิดเผย PIN ได้ อย่าส่งต่อให้ผู้อื่น และเก็บภาพไว้ในที่ปลอดภัย หรือใช้ตัวจัดการรหัสผ่านแทน</p>
        <button type="button" className="btn btn--primary btn--block" onClick={onContinue}>
          บันทึกไว้แล้ว · เข้าใช้งาน
        </button>
      </section>
    </div>
  )
}
