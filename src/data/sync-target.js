/* ============================================================
   SYNC_TARGET — ปลายทางซิงก์ข้อมูล (แก้ไขได้บน GitHub โดยตรง)
   ─────────────────────────────────────────────

   ✅ แนะนำสุด: โหมด 'cloud' (Firebase Realtime Database)
      ทุกคน "ไม่ต้องตั้งค่าอะไรเลย" — เปิดแอปแล้วข้อมูลซิงก์เองทุกเครื่อง
      เจ้าของระบบตั้งค่าครั้งเดียว (≈10 นาที) ตามคู่มือใน docs/cloud-setup.md
        1. เปลี่ยน mode ด้านล่างเป็น  'cloud'
        2. ใส่ firebase.apiKey และ firebase.databaseURL ที่ได้จาก Firebase Console
        3. commit — เสร็จ! ทุกเครื่องซิงก์อัตโนมัติทันที

   โหมดสำรอง (GitHub): 'gist' | 'repo' — ผู้ใช้ต้องมี token
     gistId ว่าง    = สร้าง secret gist ใหม่ของ token นั้น
     gistId ไม่ว่าง = ทุกคนแชร์ฐานเดียวกัน
   ลิงก์เชื่อมอัตโนมัติ: ?sync=gist:{token}:{gistId?} | ?sync=repo:{token} |
     ?sync=cloud:{apiKey}:{databaseURL-เข้ารหัส}  (สร้างจากปุ่ม "คัดลอกลิงก์" ในแผงเชื่อมต่อ)
   ============================================================ */
export const SYNC_TARGET = {
  mode: 'gist', // 'cloud' | 'gist' | 'repo'
  gistId: '',
  path: 'bacc-data.json',
  owner: '',
  repo: '',
  branch: 'main',
  firebase: {
    apiKey: '', // ← วาง Web API Key (ขึ้นต้น AIza...) จาก Firebase Console
    databaseURL: '', // ← เช่น https://bacc-exam-default-rtdb.asia-southeast1.firebasedatabase.app
  },
}
